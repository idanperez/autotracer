import jaeger, { TracingConfig, TracingOptions } from 'jaeger-client';
import * as opentracing from 'opentracing';
import TracingSettings from './tracing-settings';

export default function initJaegerTracer(settings: TracingSettings): opentracing.Tracer {
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
