import * as opentracing from 'opentracing';

export default interface autoSpan {
    id: string;
    span: opentracing.Span;
    finish(): void;
    context(): opentracing.SpanContext;
}
