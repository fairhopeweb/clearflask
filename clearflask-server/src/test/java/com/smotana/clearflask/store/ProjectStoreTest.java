// SPDX-FileCopyrightText: 2019-2021 Matus Faro <matus@smotana.com>
// SPDX-License-Identifier: AGPL-3.0-only
package com.smotana.clearflask.store;

import com.google.common.collect.ImmutableList;
import com.google.common.collect.ImmutableSet;
import com.google.inject.AbstractModule;
import com.google.inject.Inject;
import com.google.inject.util.Modules;
import com.kik.config.ice.ConfigSystem;
import com.smotana.clearflask.api.model.VersionedConfig;
import com.smotana.clearflask.api.model.VersionedConfigAdmin;
import com.smotana.clearflask.store.ProjectStore.Project;
import com.smotana.clearflask.store.dynamo.InMemoryDynamoDbProvider;
import com.smotana.clearflask.store.dynamo.mapper.DynamoMapperImpl;
import com.smotana.clearflask.store.impl.DynamoProjectStore;
import com.smotana.clearflask.testutil.AbstractTest;
import com.smotana.clearflask.util.IdUtil;
import com.smotana.clearflask.util.IntercomUtil;
import com.smotana.clearflask.util.ModelUtil;
import com.smotana.clearflask.util.ProjectUpgrader;
import com.smotana.clearflask.web.Application;
import com.smotana.clearflask.web.security.Sanitizer;
import lombok.extern.slf4j.Slf4j;
import org.junit.Test;

import java.util.Optional;

import static org.junit.Assert.*;

@Slf4j
public class ProjectStoreTest extends AbstractTest {

    @Inject
    private ProjectStore store;

    @Override
    protected void configure() {
        super.configure();

        bindMock(ContentStore.class);
        bindMock(ProjectUpgrader.class);

        install(Modules.override(
                Application.module(),
                DynamoProjectStore.module(),
                InMemoryDynamoDbProvider.module(),
                DynamoMapperImpl.module(),
                Sanitizer.module(),
                IntercomUtil.module()
        ).with(new AbstractModule() {
            @Override
            protected void configure() {
                install(ConfigSystem.overrideModule(DynamoProjectStore.Config.class, om -> {
                    om.override(om.id().enableConfigCacheRead()).withValue(true);
                    om.override(om.id().enableSlugCacheRead()).withValue(true);
                }));
            }
        }));
    }

    @Test(timeout = 10_000L)
    public void test() throws Exception {
        String newProject = "newProject";
        store.createProject(IdUtil.randomId(), newProject, ModelUtil.createEmptyConfig(newProject));

        assertTrue(store.getProject(newProject, false).isPresent());
        assertFalse(store.getProjects(ImmutableSet.of(newProject), false).isEmpty());

        Project project = store.getProject(newProject, true).get();
        VersionedConfig c = project.getVersionedConfig();
        VersionedConfigAdmin ca = project.getVersionedConfigAdmin();
        assertEquals(ImmutableSet.of(project), store.getProjects(ImmutableSet.of(newProject), false));

        VersionedConfigAdmin ca1 = ca.toBuilder()
                .version("ca1")
                .config(ca.getConfig().toBuilder()
                        .name("New name")
                        .build()).build();
        store.updateConfig(newProject, Optional.of(ca.getVersion()), ca1, false);
        assertEquals(Optional.of(ca1), store.getProject(newProject, false).map(Project::getVersionedConfigAdmin));

        VersionedConfigAdmin ca2 = ca.toBuilder()
                .version("ca2")
                .config(ca.getConfig().toBuilder()
                        .name("New name again")
                        .build()).build();
        try {
            store.updateConfig(newProject, Optional.of(ca.getVersion()), ca2, false);
            fail();
        } catch (Exception ex) {
            log.info("Expected updating conflict", ex);
        }
        assertEquals(Optional.of(ca1), store.getProject(newProject, false).map(Project::getVersionedConfigAdmin));

        VersionedConfig c1 = c.toBuilder()
                .version(ca1.getVersion())
                .config(c.getConfig().toBuilder()
                        .name(ca1.getConfig().getName())
                        .build()).build();
        assertEquals(Optional.of(c1), store.getProject(newProject, true).map(Project::getVersionedConfig));
        assertEquals(Optional.of(c1), store.getProject(newProject, false).map(Project::getVersionedConfig));
    }

    @Test(timeout = 10_000L)
    public void testInvitations() throws Exception {
        String projectId = "projectId";
        Project project = store.createProject(IdUtil.randomId(), projectId, ModelUtil.createEmptyConfig(projectId));

        ProjectStore.InvitationModel invitation = store.createInvitation(projectId, "sandy@example.com", "Johnny");
        ProjectStore.InvitationModel invitationExpected = new ProjectStore.InvitationModel(
                invitation.getInvitationId(),
                projectId,
                "sandy@example.com",
                "Johnny",
                project.getVersionedConfigAdmin().getConfig().getName(),
                null,
                invitation.getTtlInEpochSec());
        assertEquals(invitationExpected, invitation);
        assertEquals(Optional.of(invitationExpected), store.getInvitation(invitation.getInvitationId()));
        assertEquals(Optional.empty(), store.getInvitation("asdfdsaf"));
        assertEquals(ImmutableList.of(invitationExpected), store.getInvitations(projectId));

        assertEquals(ImmutableSet.of(), store.getProject(projectId, true).get().getModel().getAdminsAccountIds());
        String admin1AccountId = IdUtil.randomId();
        assertEquals(projectId, store.acceptInvitation(invitation.getInvitationId(), admin1AccountId));
        assertEquals(ImmutableSet.of(admin1AccountId), store.getProject(projectId, true).get().getModel().getAdminsAccountIds());

        String admin2AccountId = IdUtil.randomId();
        store.addAdmin(projectId, admin2AccountId);
        assertEquals(ImmutableSet.of(admin1AccountId, admin2AccountId), store.getProject(projectId, true).get().getModel().getAdminsAccountIds());
        store.addAdmin(projectId, admin2AccountId);
        assertEquals(ImmutableSet.of(admin1AccountId, admin2AccountId), store.getProject(projectId, true).get().getModel().getAdminsAccountIds());

        store.removeAdmin(projectId, admin1AccountId);
        assertEquals(ImmutableSet.of(admin2AccountId), store.getProject(projectId, true).get().getModel().getAdminsAccountIds());

        store.removeAdmin(projectId, admin1AccountId);
        assertEquals(ImmutableSet.of(admin2AccountId), store.getProject(projectId, true).get().getModel().getAdminsAccountIds());
    }
}