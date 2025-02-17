// SPDX-FileCopyrightText: 2019-2020 Matus Faro <matus@smotana.com>
// SPDX-License-Identifier: AGPL-3.0-only
package com.smotana.clearflask.security.limiter;

import javax.ws.rs.container.ContainerRequestContext;

public interface Limiter {

    void filter(ContainerRequestContext requestContext, Limit limit, String remoteIp, String target);
}
