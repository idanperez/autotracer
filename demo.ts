import dotenv from 'dotenv';
dotenv.config({ path: '.env' });
import * as opentracing from 'opentracing';
// tslint:disable-next-line: no-var-requires
const agent2 = require('elastic-apm-node').start({
    serviceName: 'try-apm',
    secretToken: '',
    serverUrl: 'http://pelk.francecentral.cloudapp.azure.com:8200',
});

// tslint:disable-next-line: variable-name
const Tracer = require('elastic-apm-node-opentracing')
// Pass the Elastic APM agent as an argument to the OpenTracing tracer
const agent = new Tracer(agent2) as opentracing.Tracer;

const firstSpan = agent.startSpan('new span');

const secSpan = agent.startSpan('sec', { childOf: firstSpan });

setTimeout(() => {
    firstSpan.finish();
    secSpan.finish();
}, 1000)

