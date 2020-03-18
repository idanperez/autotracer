import * as express from 'express';
import * as opentracing from 'opentracing';
import { FORMAT_HTTP_HEADERS } from 'opentracing';
import url from 'url';
import uuidv4 from 'uuid/v4';
import tracingConsts from './tracingConsts';
import * as cls from 'cls-hooked';

import autoSpan from './autoSpan';
import { HookedTracer } from './HookedTracer';

const tracingNamespace = cls.createNamespace(tracingConsts.clsNameSpace);



type NotPromise<T> = T extends Promise<any> ? never : T;
export default class autoTracer {
    public static tracingSession(): cls.Namespace {
        return tracingNamespace;
    }

    public static setTag(key: string, value: any): void {
        const activeSpan = autoTracer.getActiveSpan();
        if (activeSpan && activeSpan !== undefined && activeSpan !== null && activeSpan.span) {
            activeSpan.span.setTag(key, value);
        }
    }

    public static middleware(regexToRoute: { [regex: string]: string } = {}, ignoredRoutesRegex: string[] = []) {
        const regexesToMatch: string[] = Object.keys(regexToRoute) as string[];
        return function middleware(req: express.Request, _res: express.Response, next: express.NextFunction) {
            const pathName = url.parse(req.url).pathname;
            if (ignoredRoutesRegex.findIndex((_) => pathName.match(_) !== null) !== -1) {
                return next();
            }

            const corrcetRegex = regexesToMatch.find((_) => pathName.match(_) !== null);
            if (corrcetRegex !== undefined) {
                return autoTracer.middlewareLogic(req, _res, next, `${req.method} ${regexToRoute[corrcetRegex]}`);
            }

            autoTracer.middlewareLogic(req, _res, next);
        };
    }

    public static autoTraceAsyncFunction(functionName: string, childOf: boolean = true) {
        return function (this: any, _target: object, _propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<(...params: any[]) => Promise<any>>) {
            const functionValue = descriptor.value;
            descriptor.value = function (...params) {
                const context = this;
                return autoTracer.tracingSession().runAndReturn(async () => {
                    const spanData = autoTracer.startNewSpan(functionName, childOf);
                    let functionResult: any;
                    try {
                        functionResult = functionValue.apply(context, params);
                        return await functionResult;
                    } catch (er) {
                        spanData.span.setTag('error', true);
                        throw er;
                    } finally {
                        spanData.finish();
                    }
                }).catch((err) => { throw err; });
            };
        };
    }
    public static autoTraceSyncFunction(functionName: string, childOf: boolean = true) {
        return function <T>(this: any, _target: object, _propertyKey: string | symbol, descriptor: TypedPropertyDescriptor<(...params: any[]) => NotPromise<T>>) {

            const functionValue = descriptor.value;
            descriptor.value = function (...params) {
                const context = this;
                return autoTracer.tracingSession().runAndReturn(() => {
                    const spanData = autoTracer.startNewSpan(functionName, childOf);
                    let functionResult: any;
                    try {
                        functionResult = functionValue.apply(context, params);
                        return functionResult;
                    } catch (er) {
                        spanData.span.setTag('error', true);
                        throw er;
                    } finally {
                        spanData.finish();
                    }
                });
            };
        };
    }

    public static startNewSpan(spanName: string, childOf: boolean = true, parentSpan: opentracing.Span | opentracing.SpanContext = null): autoSpan {
        const tracer = opentracing.globalTracer();
        if (!tracer) {
            return null;
        }

        const session = autoTracer.tracingSession();
        const activeSpanData = session.get(tracingConsts.activeSpan) as autoSpan;
        const activeSpan: opentracing.SpanContext = activeSpanData ? activeSpanData.context() : null;
        const spanToFollow = parentSpan || activeSpan;
        let tracingOptions: opentracing.SpanOptions = {};
        if (spanToFollow && spanToFollow !== null && spanToFollow !== undefined) {
            tracingOptions = childOf ? { childOf: spanToFollow } : {
                references: [
                    opentracing.followsFrom(spanToFollow),
                ],
            };
        }

        const currentFunctionSpan = tracer.startSpan(spanName, tracingOptions);
        const currentSpanId: string = uuidv4();
        const functionSpanData: HookedTracer = new HookedTracer(
            currentSpanId,
            currentFunctionSpan,
            parentSpan ? null : activeSpanData ? activeSpanData.id : null);

        session.set(currentSpanId, functionSpanData);
        session.set(tracingConsts.activeSpan, functionSpanData);

        return functionSpanData;
    }

    public static getActiveSpan(): autoSpan {
        const activeSpanData = autoTracer.getActiveSpanData();
        return activeSpanData;
    }
    private static middlewareLogic(req: express.Request, _res: express.Response, next: express.NextFunction, spanName: string = null) {
        const overrideOpName = spanName === null;
        spanName = spanName !== null ? spanName : url.parse(req.url).pathname;

        const tracer = opentracing.globalTracer();
        if (!tracer) {
            return next();
        }

        const session = autoTracer.tracingSession();
        session.run(() => {
            let autoSpan: autoSpan;
            if (req.headers['uber-trace-id'] === undefined) {
                autoSpan = autoTracer.startNewSpan(spanName);
            } else {
                const parentSpanContext = tracer.extract(FORMAT_HTTP_HEADERS, req.headers);
                autoSpan = autoTracer.startNewSpan(spanName, true, parentSpanContext);
            }

            autoSpan.span.setTag('http.method', req.method);
            autoSpan.span.setTag('http.url', req.url);

            const requestEnded = () => {
                if (overrideOpName && req.route && req.route.path) {
                    autoSpan.span.setOperationName(`${req.method} ${req.baseUrl}${req.route.path}`);
                }

                autoSpan.span.setTag('http.status_code', _res.statusCode);
                if (_res.statusCode >= 500) {
                    autoSpan.span.setTag('error', true);
                }
                autoSpan.finish();
            };

            _res.on('close', session.bind(requestEnded));
            _res.on('end', session.bind(requestEnded));
            _res.on('finish', session.bind(requestEnded));

            next();
        });
    }

    private static getActiveSpanData(): HookedTracer {
        const session = autoTracer.tracingSession();
        const activeSpanData = session.get(tracingConsts.activeSpan) as HookedTracer;

        return activeSpanData;
    }
}
