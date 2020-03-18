# autotracer

## Active Span

  Added openTracing activeSpan using continuse local storage.</br>
  No need to pass the span along your code anymore.</br>
  
  If you ever used opentracing in nodejs, you must have noticed how ugly it makes your code - every function need to receive the current active span, or you wont be able to create a new span, as a chiled of the active span, neither adding a tags to the active span.
  
  
  that made me frustrated - therefore I create the autoTracer - its uses your globalTracer and save the active span for you.
  
  unfortunately I could not create the tracer as an implmpentation to the openTracing.Tracer due to the face of the Reference Type - I did not want you to pass me the active span. hence you wont use exactly the same inteface of openTracing, but almost.
  
  
  You can access your active span any time, and access all the geniune objesct of opentracing via autoTracer.
  
  
  Avoiding vendor locking stays the same - just init the global tracer as the new tracer that you want and everything will work just fine. 


## Decorator 

 ### Create a function decorator - to auto trace this mehod as a new span</br>
 
 I got sick of creating a new span at the start of any method! 
 
 
 Therefore, I created a decorator, that will auto trace this function for you! easy as that. 
 

## Middleware 

 ### Created an express middleware to auto trace incoming requests</br>
 
 any incoming request will create a new trace (of will follow an alreasy exist trace, and will create a new span, those - if the request sender passed a tracing header).
 
 
 any request will tagged as succesfull/ error automaticlly
 
 any request will tagged its status code
 
 any request will tagged the request method (GET/POST/DELETE..)
 
 any request will tagged the route of the request (Eg /api/items/{itemId})
 
 
