#include "line_config.h"

Napi::FunctionReference LineConfig::constructor;

Napi::Object LineConfig::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "LineConfig", {
    InstanceMethod("setOffset", &LineConfig::SetOffset),
    InstanceMethod("setDirection", &LineConfig::SetDirection),
    InstanceMethod("setEdge", &LineConfig::SetEdge),
    InstanceMethod("setDrive", &LineConfig::SetDrive),
    InstanceMethod("setBias", &LineConfig::SetBias),
    InstanceMethod("setActiveLow", &LineConfig::SetActiveLow),
    InstanceMethod("setOutputValue", &LineConfig::SetOutputValue),
    InstanceMethod("setDebouncePeriod", &LineConfig::SetDebouncePeriod)
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("LineConfig", func);
  return exports;
}

LineConfig::LineConfig(const Napi::CallbackInfo& info) : Napi::ObjectWrap<LineConfig>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  config_ = std::make_shared<gpiod::line_config>();
}

LineConfig::~LineConfig() {
  config_.reset();
  settings_map_.clear();
}

std::shared_ptr<gpiod::line_settings> LineConfig::EnsureSettingsForCurrentOffset() {
  // Check if settings for the current offset already exist
  auto it = settings_map_.find(current_offset_);
  if (it != settings_map_.end()) {
    return it->second;
  }
  
  // Create new settings for this offset
  auto settings = std::make_shared<gpiod::line_settings>();
  settings_map_[current_offset_] = settings;
  
  // Add the settings to the config
  config_->add_line_settings(current_offset_, *settings);
  
  return settings;
}

Napi::Value LineConfig::SetOffset(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Offset number expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  try {
    current_offset_ = info[0].As<Napi::Number>().Uint32Value();
    
    // Ensure settings exist for this offset
    EnsureSettingsForCurrentOffset();
    
    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to set offset: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Undefined();
  }
}

Napi::Value LineConfig::SetDirection(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Direction string expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string direction = info[0].As<Napi::String>().Utf8Value();

  try {
    // Get or create settings for the current offset
    auto settings = EnsureSettingsForCurrentOffset();
    
    // Set the direction
    if (direction == "input") {
      settings->set_direction(gpiod::line::direction::INPUT);
    } else if (direction == "output") {
      settings->set_direction(gpiod::line::direction::OUTPUT);
    } else {
      Napi::TypeError::New(env, "Invalid direction: must be 'input' or 'output'").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    
    // Update the config with the new settings
    config_->add_line_settings(current_offset_, *settings);

    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to set direction: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Undefined();
  }
}

Napi::Value LineConfig::SetEdge(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Edge string expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string edge = info[0].As<Napi::String>().Utf8Value();

  try {
    // Get or create settings for the current offset
    auto settings = EnsureSettingsForCurrentOffset();
    
    // Set the edge detection
    if (edge == "none") {
      settings->set_edge_detection(gpiod::line::edge::NONE);
    } else if (edge == "rising") {
      settings->set_edge_detection(gpiod::line::edge::RISING);
    } else if (edge == "falling") {
      settings->set_edge_detection(gpiod::line::edge::FALLING);
    } else if (edge == "both") {
      settings->set_edge_detection(gpiod::line::edge::BOTH);
    } else {
      Napi::TypeError::New(env, "Invalid edge: must be 'none', 'rising', 'falling', or 'both'").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    
    // Update the config with the new settings
    config_->add_line_settings(current_offset_, *settings);

    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to set edge: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Undefined();
  }
}

Napi::Value LineConfig::SetDrive(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Drive string expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string drive = info[0].As<Napi::String>().Utf8Value();

  try {
    // Get or create settings for the current offset
    auto settings = EnsureSettingsForCurrentOffset();
    
    // Set the drive
    if (drive == "push_pull") {
      settings->set_drive(gpiod::line::drive::PUSH_PULL);
    } else if (drive == "open_drain") {
      settings->set_drive(gpiod::line::drive::OPEN_DRAIN);
    } else if (drive == "open_source") {
      settings->set_drive(gpiod::line::drive::OPEN_SOURCE);
    } else {
      Napi::TypeError::New(env, "Invalid drive: must be 'push_pull', 'open_drain', or 'open_source'").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    
    // Update the config with the new settings
    config_->add_line_settings(current_offset_, *settings);

    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to set drive: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Undefined();
  }
}

Napi::Value LineConfig::SetBias(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "Bias string expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  std::string bias = info[0].As<Napi::String>().Utf8Value();

  try {
    // Get or create settings for the current offset
    auto settings = EnsureSettingsForCurrentOffset();
    
    // Set the bias
    if (bias == "unknown") {
      settings->set_bias(gpiod::line::bias::UNKNOWN);
    } else if (bias == "disabled") {
      settings->set_bias(gpiod::line::bias::DISABLED);
    } else if (bias == "pull_up") {
      settings->set_bias(gpiod::line::bias::PULL_UP);
    } else if (bias == "pull_down") {
      settings->set_bias(gpiod::line::bias::PULL_DOWN);
    } else {
      Napi::TypeError::New(env, "Invalid bias: must be 'unknown', 'disabled', 'pull_up', or 'pull_down'").ThrowAsJavaScriptException();
      return env.Undefined();
    }
    
    // Update the config with the new settings
    config_->add_line_settings(current_offset_, *settings);

    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to set bias: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Undefined();
  }
}

Napi::Value LineConfig::SetActiveLow(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsBoolean()) {
    Napi::TypeError::New(env, "Boolean expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  bool active_low = info[0].As<Napi::Boolean>().Value();

  try {
    // Get or create settings for the current offset
    auto settings = EnsureSettingsForCurrentOffset();
    
    // Set active low
    settings->set_active_low(active_low);
    
    // Update the config with the new settings
    config_->add_line_settings(current_offset_, *settings);

    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to set active low: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Undefined();
  }
}

Napi::Value LineConfig::SetOutputValue(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsBoolean()) {
    Napi::TypeError::New(env, "Boolean expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  bool value = info[0].As<Napi::Boolean>().Value();

  try {
    // Get or create settings for the current offset
    auto settings = EnsureSettingsForCurrentOffset();
    
    // Set output value - convert boolean to gpiod::line::value
    settings->set_output_value(value ? gpiod::line::value::ACTIVE : gpiod::line::value::INACTIVE);
    
    // Update the config with the new settings
    config_->add_line_settings(current_offset_, *settings);

    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to set output value: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Undefined();
  }
}

Napi::Value LineConfig::SetDebouncePeriod(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Debounce period in microseconds expected").ThrowAsJavaScriptException();
    return env.Undefined();
  }

  uint64_t period_us = info[0].As<Napi::Number>().Int64Value();

  try {
    // Get or create settings for the current offset
    auto settings = EnsureSettingsForCurrentOffset();
    
    // Set the debounce period in microseconds
    settings->set_debounce_period(std::chrono::microseconds(period_us));
    
    // Update the config with the new settings
    config_->add_line_settings(current_offset_, *settings);

    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to set debounce period: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Undefined();
  }
}

std::shared_ptr<gpiod::line_config> LineConfig::GetConfig() const {
  return config_;
}
