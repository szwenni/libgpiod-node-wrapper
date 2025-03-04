#include "line.h"
#include <chrono>

Napi::FunctionReference Line::constructor;

Napi::Object Line::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "Line", {
    InstanceMethod("getValue", &Line::GetValue),
    InstanceMethod("setValue", &Line::SetValue),
    InstanceMethod("export", &Line::Export),
    InstanceMethod("unexport", &Line::Unexport),
    InstanceMethod("watch", &Line::Watch),
    InstanceMethod("unwatch", &Line::Unwatch)
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Line", func);
  return exports;
}

Line::Line(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Line>(info), exported_(false), watching_(false) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 2 || !info[0].IsObject() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Chip object and offset number expected").ThrowAsJavaScriptException();
    return;
  }

  // Get the chip object
  Napi::Object chipObj = info[0].As<Napi::Object>();
  if (!chipObj.InstanceOf(Chip::constructor.Value())) {
    Napi::TypeError::New(env, "First argument must be a Chip instance").ThrowAsJavaScriptException();
    return;
  }

  // Store the Chip object with a shared_ptr
  chip_ = std::shared_ptr<Chip>(Napi::ObjectWrap<Chip>::Unwrap(chipObj), [](Chip*){});
  offset_ = info[1].As<Napi::Number>().Uint32Value();
}

Line::~Line() {
  StopWatchThread();
  
  if (exported_) {
    try {
      request_.reset();
      exported_ = false;
    } catch (...) {
      // Ignore exceptions in destructor
    }
  }
}

Napi::Value Line::GetValue(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!exported_ || !request_) {
    Napi::Error::New(env, "Line is not exported").ThrowAsJavaScriptException();
    return env.Null();
  }

  try {
    gpiod::line::value value = request_->GetRequest()->get_value(offset_);
    return Napi::Number::New(env, static_cast<int>(value));
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to get line value: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value Line::SetValue(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Value number expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!exported_ || !request_) {
    Napi::Error::New(env, "Line is not exported").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  int intValue = info[0].As<Napi::Number>().Int32Value();
  gpiod::line::value value = intValue ? gpiod::line::value::ACTIVE : gpiod::line::value::INACTIVE;

  try {
    request_->GetRequest()->set_value(offset_, value);
    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to set line value: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Undefined();
  }
}

Napi::Value Line::Export(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsObject()) {
    Napi::TypeError::New(env, "LineRequest object expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Get the line request object
  Napi::Object requestObj = info[0].As<Napi::Object>();
  if (!requestObj.InstanceOf(LineRequest::constructor.Value())) {
    Napi::TypeError::New(env, "Argument must be a LineRequest instance").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Unexport if already exported
  if (exported_) {
    request_.reset();
    exported_ = false;
  }

  request_ = std::shared_ptr<LineRequest>(Napi::ObjectWrap<LineRequest>::Unwrap(requestObj));
  exported_ = true;

  return env.Undefined();
}

Napi::Value Line::Unexport(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  StopWatchThread();

  if (exported_) {
    request_.reset();
    exported_ = false;
  }

  return env.Undefined();
}

Napi::Value Line::Watch(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsFunction()) {
    Napi::TypeError::New(env, "Callback function expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  if (!exported_ || !request_) {
    Napi::Error::New(env, "Line is not exported").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  // Stop any existing watch thread
  StopWatchThread();

  // Create a thread-safe function
  Napi::Function callback = info[0].As<Napi::Function>();
  tsfn_ = Napi::ThreadSafeFunction::New(
    env,
    callback,
    "GPIO Line Watch Callback",
    0,
    1,
    [this](Napi::Env) {
      // Finalize callback
      watching_ = false;
      watch_cv_.notify_all();
    }
  );

  // Start the watch thread
  watching_ = true;
  watch_thread_ = std::thread(&Line::WatchThread, this);

  return env.Undefined();
}

Napi::Value Line::Unwatch(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  StopWatchThread();

  return env.Undefined();
}

void Line::WatchThread() {
  // Check if we have a valid request
  if (!request_ || !exported_) {
    return;
  }

  try {
    // Get a copy of the shared_ptr to the request
    std::shared_ptr<gpiod::line_request> request = request_->GetRequest();
    ::gpiod::edge_event_buffer buffer(1);
    
    while (watching_) {
      try {
        // Wait for an event with a timeout
        
        bool event_available = request->wait_edge_events(std::chrono::milliseconds(100));

        
        if (watching_ && event_available) {
          request->read_edge_events(buffer);
          // Get the current value
          int value = buffer.get_event(0).type() == ::gpiod::edge_event::event_type::RISING_EDGE ? 1 : 0;
          
          // Call the JavaScript callback
          auto callback = [value](Napi::Env env, Napi::Function jsCallback) {
            jsCallback.Call({env.Null(), Napi::Number::New(env, value)});
          };
          
          tsfn_.BlockingCall(callback);
        }
      } catch (const std::exception& e) {
        if (watching_) {
          // Call the JavaScript callback with an error
          auto callback = [e](Napi::Env env, Napi::Function jsCallback) {
            jsCallback.Call({Napi::Error::New(env, e.what()).Value(), env.Null()});
          };
          
          tsfn_.BlockingCall(callback);
          
          // Stop watching on error
          watching_ = false;
        }
      }
    }
  } catch (...) {
    // Ignore exceptions when stopping
  }
}

void Line::StopWatchThread() {
  if (watching_) {
    watching_ = false;
    
    if (watch_thread_.joinable()) {
      watch_cv_.notify_all();
      watch_thread_.join();
    }
    
    tsfn_.Release();
  }
}
