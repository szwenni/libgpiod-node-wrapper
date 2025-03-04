#include "line_request.h"

Napi::FunctionReference LineRequest::constructor;

Napi::Object LineRequest::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "LineRequest", {
    InstanceMethod("getValue", &LineRequest::GetValue),
    InstanceMethod("setValue", &LineRequest::SetValue),
    InstanceMethod("release", &LineRequest::Release)
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("LineRequest", func);
  return exports;
}

LineRequest::LineRequest(const Napi::CallbackInfo& info) : Napi::ObjectWrap<LineRequest>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 3 || !info[0].IsObject() || !info[1].IsArray() || !info[2].IsObject()) {
    Napi::TypeError::New(env, "Chip object, offsets array, and LineConfig object expected").ThrowAsJavaScriptException();
    return;
  }

  // Get the chip object
  Napi::Object chipObj = info[0].As<Napi::Object>();
  if (!chipObj.InstanceOf(Chip::constructor.Value())) {
    Napi::TypeError::New(env, "First argument must be a Chip instance").ThrowAsJavaScriptException();
    return;
  }
  chip_ = std::shared_ptr<Chip>(Napi::ObjectWrap<Chip>::Unwrap(chipObj), [](Chip*){});

  // Get the offsets array
  Napi::Array offsetsArray = info[1].As<Napi::Array>();
  for (uint32_t i = 0; i < offsetsArray.Length(); i++) {
    Napi::Value val = offsetsArray[i];
    if (!val.IsNumber()) {
      Napi::TypeError::New(env, "Offsets array must contain only numbers").ThrowAsJavaScriptException();
      return;
    }
    offsets_.push_back(val.As<Napi::Number>().Uint32Value());
  }

  // Get the line config object
  Napi::Object configObj = info[2].As<Napi::Object>();
  if (!configObj.InstanceOf(LineConfig::constructor.Value())) {
    Napi::TypeError::New(env, "Third argument must be a LineConfig instance").ThrowAsJavaScriptException();
    return;
  }
  config_ = std::shared_ptr<LineConfig>(Napi::ObjectWrap<LineConfig>::Unwrap(configObj), [](LineConfig*){});

  try {
    // Create the line request using request_builder
    gpiod::request_builder builder = chip_->GetChip()->prepare_request();
    
    // Set consumer name
    builder.set_consumer("libgpiod2-node");
    
    // Get the line settings from the config
    const auto& settings_map = config_->GetConfig()->get_line_settings();
    
    // If there are no specific line settings in the config, apply the global config
    if (settings_map.empty()) {
      // Set the global line configuration
      builder.set_line_config(*config_->GetConfig());
      
      // Add each offset with default settings
      for (const auto& offset : offsets_) {
        gpiod::line_settings settings;
        builder.add_line_settings(offset, settings);
      }
    } else {
      // Apply specific settings for each offset
      for (const auto& offset : offsets_) {
        // Check if there are settings for this offset in the config
        auto settings_it = settings_map.find(offset);
        
        if (settings_it != settings_map.end()) {
          // Use the existing settings from the config
          builder.add_line_settings(offset, settings_it->second);
        } else {
          // If there are no settings for this offset but settings exist for other offsets,
          // use the settings from offset 0 as a fallback (if it exists)
          auto default_settings_it = settings_map.find(0);
          if (default_settings_it != settings_map.end()) {
            builder.add_line_settings(offset, default_settings_it->second);
          } else {
            // Otherwise, use the first available settings as a template
            builder.add_line_settings(offset, settings_map.begin()->second);
          }
        }
      }
    }
    
    // Request the lines
    request_ = std::make_shared<gpiod::line_request>(builder.do_request());
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to request lines: " + std::string(e.what())).ThrowAsJavaScriptException();
    return;
  }
}

LineRequest::~LineRequest() {
  if (request_) {
    try {
      request_.reset();
    } catch (...) {
      // Ignore exceptions in destructor
    }
  }
}

Napi::Value LineRequest::GetValue(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Offset number expected").ThrowAsJavaScriptException();
    return env.Null();
  }

  unsigned int offset = info[0].As<Napi::Number>().Uint32Value();

  if (!request_) {
    Napi::Error::New(env, "Line request is not active").ThrowAsJavaScriptException();
    return env.Null();
  }

  try {
    gpiod::line::value value = request_->get_value(offset);
    return Napi::Number::New(env, static_cast<int>(value));
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to get value: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value LineRequest::SetValue(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 2 || !info[0].IsNumber() || !info[1].IsNumber()) {
    Napi::TypeError::New(env, "Offset and value numbers expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  unsigned int offset = info[0].As<Napi::Number>().Uint32Value();
  int intValue = info[1].As<Napi::Number>().Int32Value();
  gpiod::line::value value = intValue ? gpiod::line::value::ACTIVE : gpiod::line::value::INACTIVE;

  if (!request_) {
    Napi::Error::New(env, "Line request is not active").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  try {
    request_->set_value(offset, value);
    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to set value: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Undefined();
  }
}

Napi::Value LineRequest::Release(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (request_) {
    try {
      request_.reset();
      return env.Undefined();
    } catch (const std::exception& e) {
      Napi::Error::New(env, "Failed to release lines: " + std::string(e.what())).ThrowAsJavaScriptException();
      return env.Undefined();
    }
  }

  return env.Undefined();
}

std::shared_ptr<gpiod::line_request> LineRequest::GetRequest() const {
  return request_;
}
