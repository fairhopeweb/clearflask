// SPDX-FileCopyrightText: 2019-2020 Matus Faro <matus@smotana.com>
// SPDX-License-Identifier: AGPL-3.0-only
package com.smotana.clearflask.util;

import com.google.common.util.concurrent.UncheckedExecutionException;
import lombok.SneakyThrows;
import lombok.extern.slf4j.Slf4j;

import java.util.concurrent.Callable;
import java.util.concurrent.ExecutionException;

@Slf4j
public class CacheUtil {
    @SneakyThrows
    public static <V> V guavaCacheUnwrapException(Callable<V> callable) throws Exception {
        try {
            return callable.call();
        } catch (ExecutionException | UncheckedExecutionException ex) {
            throw ex.getCause();
        }
    }
}
