// SPDX-FileCopyrightText: 2019-2021 Matus Faro <matus@smotana.com>
// SPDX-License-Identifier: AGPL-3.0-only
package com.smotana.clearflask.testutil;

import com.amazonaws.auth.AWSCredentialsProvider;
import com.amazonaws.auth.AWSStaticCredentialsProvider;
import com.amazonaws.auth.BasicAWSCredentials;
import com.carrotsearch.randomizedtesting.RandomizedRunner;
import com.carrotsearch.randomizedtesting.annotations.ThreadLeakScope;
import com.google.inject.AbstractModule;
import com.google.inject.Inject;
import com.google.inject.util.Modules;
import com.kik.config.ice.ConfigSystem;
import com.smotana.clearflask.billing.KillBillClientProvider;
import com.smotana.clearflask.store.elastic.DefaultElasticSearchProvider;
import com.smotana.clearflask.util.IdUtil;
import lombok.extern.slf4j.Slf4j;
import org.elasticsearch.action.admin.indices.delete.DeleteIndexRequest;
import org.elasticsearch.client.RequestOptions;
import org.elasticsearch.client.RestHighLevelClient;
import org.junit.Before;
import org.junit.runner.RunWith;
import org.killbill.billing.client.KillBillHttpClient;

import java.net.ConnectException;

import static com.carrotsearch.randomizedtesting.annotations.ThreadLeakScope.Scope.NONE;
import static org.junit.Assert.fail;

@Slf4j
@RunWith(RandomizedRunner.class)
@ThreadLeakScope(NONE)
public abstract class AbstractIT extends AbstractTest {

    @Inject
    protected RestHighLevelClient elastic;
    @Inject
    protected KillBillHttpClient kbClient;

    @Override
    protected void configure() {
        super.configure();

        bind(AWSCredentialsProvider.class).toInstance(new AWSStaticCredentialsProvider(new BasicAWSCredentials("", "")));

        install(Modules.override(
                DefaultElasticSearchProvider.module(),
                KillBillClientProvider.module()
        ).with(new AbstractModule() {
            @Override
            protected void configure() {
                install(ConfigSystem.overrideModule(DefaultElasticSearchProvider.Config.class, om -> {
                    om.override(om.id().serviceEndpoint()).withValue("http://localhost:9200");
                }));
                String apiKey = IdUtil.randomAscId();
                String secretKey = IdUtil.randomId();
                log.info("KillBill test randomized apiKey {} secretKey {}", apiKey, secretKey);
                install(ConfigSystem.overrideModule(KillBillClientProvider.Config.class, om -> {
                    om.override(om.id().host()).withValue("localhost");
                    om.override(om.id().port()).withValue(8082);
                    om.override(om.id().user()).withValue("admin");
                    om.override(om.id().pass()).withValue("password");
                    om.override(om.id().apiKey()).withValue(apiKey);
                    om.override(om.id().apiSecret()).withValue(secretKey);
                    om.override(om.id().requireTls()).withValue(false);
                }));
            }
        }));
    }

    @Before
    public void setup() throws Exception {
        super.setup();
        try {
            elastic.indices().delete(new DeleteIndexRequest()
                    .indices("_all"), RequestOptions.DEFAULT);
        } catch (ConnectException ex) {
            if ("Connection refused".equals(ex.getMessage())) {
                log.warn("Failed to connect to local ElasticSearch", ex);
                fail("Failed to connect to local ElasticSearch instance for Integration Testing, did you forget to start it?");
            } else {
                throw ex;
            }
        }
    }
}
