import * as cls from 'cls-hooked';
import jaeger, { TracingConfig, TracingOptions } from 'jaeger-client';
import * as opentracing from 'opentracing';
import tracingConsts from './tracingConsts';
import TracingSettings from './TracingSettings';

const tracingNamespace = cls.createNamespace(tracingConsts.clsNameSpace);

export function tracingSession(): cls.Namespace {
    return tracingNamespace;
}

export function wrapAutoTracer(callback?: () => void): void {
    tracingSession().run(() => callback());
}

export default function getJaegerTracer(settings: TracingSettings): opentracing.Tracer {
    const tracingConfig: TracingConfig = {
        sampler: {
            type: 'const',
            param: 1,
        },
        serviceName: settings.serviceName,
        reporter: {
            agentHost: settings.agentHostName,
        }
    };

    const tracingOptions: TracingOptions = {
    };

    const tracer = jaeger.initTracer(tracingConfig, tracingOptions);
    opentracing.initGlobalTracer(tracer);
    return opentracing.globalTracer();
}
