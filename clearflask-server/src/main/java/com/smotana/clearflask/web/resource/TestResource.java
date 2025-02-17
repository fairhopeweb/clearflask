// SPDX-FileCopyrightText: 2019-2020 Matus Faro <matus@smotana.com>
// SPDX-License-Identifier: AGPL-3.0-only
package com.smotana.clearflask.web.resource;

import com.google.common.primitives.Ints;
import com.google.inject.AbstractModule;
import com.google.inject.Module;
import com.google.inject.multibindings.Multibinder;
import com.google.inject.name.Names;
import com.smotana.clearflask.web.ApiException;
import com.smotana.clearflask.web.Application;
import lombok.extern.slf4j.Slf4j;

import javax.inject.Singleton;
import javax.validation.constraints.NotNull;
import javax.ws.rs.Consumes;
import javax.ws.rs.GET;
import javax.ws.rs.Path;
import javax.ws.rs.PathParam;
import javax.ws.rs.Produces;
import javax.ws.rs.core.MediaType;
import javax.ws.rs.core.Response;
import java.util.Optional;

@Slf4j
@Singleton
@Path("/test")
public class TestResource {

    @GET
    @Path("/throw/{httpStatus}")
    @Consumes(MediaType.WILDCARD)
    @Produces(MediaType.TEXT_PLAIN)
    public String health(@PathParam("httpStatus") @NotNull String httpStatusStr) {
        Optional.ofNullable(Ints.tryParse(httpStatusStr))
                .flatMap(httpStatusCode -> Optional.ofNullable(Response.Status.fromStatusCode(httpStatusCode)))
                .ifPresent(status -> {
                    throw new ApiException(status, "This was a successful test of " + status.name());
                });
        return "Invalid status supplied";
    }

    public static Module module() {
        return new AbstractModule() {
            @Override
            protected void configure() {
                bind(TestResource.class);
                Multibinder.newSetBinder(binder(), Object.class, Names.named(Application.RESOURCE_NAME)).addBinding()
                        .to(TestResource.class);
            }
        };
    }
}
