// SPDX-FileCopyrightText: 2019-2021 Matus Faro <matus@smotana.com>
// SPDX-License-Identifier: AGPL-3.0-only
package com.smotana.clearflask.store.impl;

import com.amazonaws.services.dynamodbv2.document.spec.DeleteItemSpec;
import com.amazonaws.services.dynamodbv2.document.spec.GetItemSpec;
import com.amazonaws.services.dynamodbv2.document.spec.PutItemSpec;
import com.amazonaws.services.route53.AmazonRoute53;
import com.amazonaws.services.route53.model.Change;
import com.amazonaws.services.route53.model.ChangeAction;
import com.amazonaws.services.route53.model.ChangeBatch;
import com.amazonaws.services.route53.model.ChangeResourceRecordSetsRequest;
import com.amazonaws.services.route53.model.ListResourceRecordSetsRequest;
import com.amazonaws.services.route53.model.ListResourceRecordSetsResult;
import com.amazonaws.services.route53.model.RRType;
import com.amazonaws.services.route53.model.ResourceRecord;
import com.amazonaws.services.route53.model.ResourceRecordSet;
import com.google.common.collect.ImmutableList;
import com.google.inject.AbstractModule;
import com.google.inject.Inject;
import com.google.inject.Module;
import com.google.inject.Singleton;
import com.kik.config.ice.ConfigSystem;
import com.kik.config.ice.annotations.DefaultValue;
import com.smotana.clearflask.store.CertStore;
import com.smotana.clearflask.store.CertStore.KeypairModel.KeypairType;
import com.smotana.clearflask.store.dynamo.mapper.DynamoMapper;
import com.smotana.clearflask.store.dynamo.mapper.DynamoMapper.TableSchema;
import com.smotana.clearflask.util.Extern;
import com.smotana.clearflask.web.ApiException;
import lombok.extern.slf4j.Slf4j;
import rx.Observable;
import rx.functions.Action1;

import javax.ws.rs.core.Response;
import java.util.Map;
import java.util.Optional;
import java.util.function.Predicate;
import java.util.regex.Pattern;

import static com.google.common.base.Preconditions.checkArgument;

@Slf4j
@Singleton
public class DynamoCertStore implements CertStore {

    public interface Config {
        @DefaultValue("")
        String hostedZoneId();

        @DefaultValue("^(_acme-challenge\\.clearflask\\.com|_greenlock-dryrun-[a-z0-9]+\\.clearflask.com)$")
        String allowedDnsHostRegex();

        Observable<String> allowedDnsHostRegexObservable();
    }

    @Inject
    private Config config;
    @Inject
    private DynamoMapper dynamoMapper;
    @Inject(optional = true)
    private AmazonRoute53 route53;

    private TableSchema<KeypairModel> keypairSchema;
    private TableSchema<ChallengeModel> challengeSchema;
    private TableSchema<CertModel> certSchema;
    private Predicate<String> allowedHostPredicate;

    @Inject
    private void setup() {
        keypairSchema = dynamoMapper.parseTableSchema(KeypairModel.class);
        challengeSchema = dynamoMapper.parseTableSchema(ChallengeModel.class);
        certSchema = dynamoMapper.parseTableSchema(CertModel.class);

        Action1<String> compileAllowedDnsHostRegex = r -> allowedHostPredicate = Pattern.compile(r).asPredicate();
        config.allowedDnsHostRegexObservable().subscribe(compileAllowedDnsHostRegex);
        compileAllowedDnsHostRegex.call(config.allowedDnsHostRegex());
    }

    @Extern
    @Override
    public Optional<KeypairModel> getKeypair(KeypairType type, String id) {
        return Optional.ofNullable(keypairSchema.fromItem(keypairSchema.table().getItem(new GetItemSpec()
                .withPrimaryKey(keypairSchema.primaryKey(Map.of(
                        "id", id,
                        "type", type))))));
    }

    @Extern
    @Override
    public void setKeypair(KeypairModel keypair) {
        keypairSchema.table().putItem(new PutItemSpec()
                .withItem(keypairSchema.toItem(keypair)));
    }

    @Extern
    @Override
    public void deleteKeypair(KeypairType type, String id) {
        keypairSchema.table().deleteItem(new DeleteItemSpec()
                .withPrimaryKey(keypairSchema.primaryKey(Map.of(
                        "id", id,
                        "type", type))));
    }

    @Extern
    @Override
    public Optional<ChallengeModel> getHttpChallenge(String key) {
        return Optional.ofNullable(challengeSchema.fromItem(challengeSchema.table().getItem(new GetItemSpec()
                .withPrimaryKey(challengeSchema.primaryKey(Map.of(
                        "key", key))))));
    }

    @Extern
    @Override
    public void setHttpChallenge(ChallengeModel challenge) {
        challengeSchema.table().putItem(new PutItemSpec()
                .withItem(challengeSchema.toItem(challenge)));
    }

    @Extern
    @Override
    public void deleteHttpChallenge(String key) {
        challengeSchema.table().deleteItem(new DeleteItemSpec()
                .withPrimaryKey(challengeSchema.primaryKey(Map.of(
                        "key", key))));
    }

    @Override
    public Optional<String> getDnsChallenge(String host) {
        if (route53 == null) {
            throw new ApiException(Response.Status.NOT_IMPLEMENTED);
        }
        checkArgument(allowedHostPredicate.test(host));
        ListResourceRecordSetsResult result = route53.listResourceRecordSets(new ListResourceRecordSetsRequest(config.hostedZoneId())
                .withStartRecordType(RRType.TXT)
                .withStartRecordName(host));
        return result.getResourceRecordSets().stream()
                .flatMap(recordSet -> recordSet.getResourceRecords().stream())
                .map(ResourceRecord::getValue)
                .findAny();
    }

    @Override
    public void setDnsChallenge(String host, String value) {
        if (route53 == null) {
            throw new ApiException(Response.Status.NOT_IMPLEMENTED);
        }
        checkArgument(allowedHostPredicate.test(host));
        route53.changeResourceRecordSets(new ChangeResourceRecordSetsRequest(
                config.hostedZoneId(),
                new ChangeBatch(ImmutableList.of(new Change(
                        ChangeAction.UPSERT, new ResourceRecordSet(
                        host,
                        RRType.TXT)
                        .withResourceRecords(new ResourceRecord("\"" + value + "\""))
                        .withTTL(300L))))));
    }

    @Override
    public void deleteDnsChallenge(String host, String value) {
        if (route53 == null) {
            throw new ApiException(Response.Status.NOT_IMPLEMENTED);
        }
        checkArgument(allowedHostPredicate.test(host));
        route53.changeResourceRecordSets(new ChangeResourceRecordSetsRequest(
                config.hostedZoneId(),
                new ChangeBatch(ImmutableList.of(new Change(
                        ChangeAction.DELETE, new ResourceRecordSet(
                        host,
                        RRType.TXT)
                        .withResourceRecords(new ResourceRecord("\"" + value + "\""))
                        .withTTL(300L))))));
    }

    @Extern
    @Override
    public Optional<CertModel> getCert(String domain) {
        return Optional.ofNullable(certSchema.fromItem(certSchema.table().getItem(new GetItemSpec()
                .withPrimaryKey(certSchema.primaryKey(Map.of(
                        "domain", domain))))));
    }

    @Extern
    @Override
    public void setCert(CertModel cert) {
        certSchema.table().putItem(new PutItemSpec()
                .withItem(certSchema.toItem(cert)));
    }

    @Extern
    @Override
    public void deleteCert(String domain) {
        certSchema.table().deleteItem(new DeleteItemSpec()
                .withPrimaryKey(certSchema.primaryKey(Map.of(
                        "domain", domain))));
    }

    public static Module module() {
        return new AbstractModule() {
            @Override
            protected void configure() {
                bind(CertStore.class).to(DynamoCertStore.class).asEagerSingleton();
                install(ConfigSystem.configModule(Config.class));
            }
        };
    }
}
