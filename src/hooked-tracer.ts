import * as opentracing from 'opentracing';
import tracingConsts from './tracing-consts';
import autoSpan from './autoSpan';
import autoTracer from './autoTracer';

export class HookedTracer implements autoSpan {
    public id: string;
    constructor(id: string, private _span: opentracing.Span, private _fatherId?: string) {
        this.id = id;
    }
    get span() {
        return this._span;
    }
    public finish() {
        const session = autoTracer.tracingSession();
        const fatherSpanData: HookedTracer = this._fatherId ? session.get(this._fatherId) : null as HookedTracer;
        this._span.finish();

        if (session.active) {
            const activeSpan = session.get(tracingConsts.activeSpan) as HookedTracer;
            if (activeSpan !== undefined && activeSpan && activeSpan.id === this.id) {
                session.set(tracingConsts.activeSpan, fatherSpanData);
            }
        }
    }
    public context(): opentracing.SpanContext {
        return this._span.context();
    }
}
