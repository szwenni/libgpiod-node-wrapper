#include "chip.h"

Napi::FunctionReference Chip::constructor;

Napi::Object Chip::Init(Napi::Env env, Napi::Object exports) {
  Napi::HandleScope scope(env);

  Napi::Function func = DefineClass(env, "Chip", {
    InstanceMethod("getNumLines", &Chip::GetNumLines),
    InstanceMethod("getLineInfo", &Chip::GetLineInfo),
    InstanceMethod("getLabel", &Chip::GetLabel),
    InstanceMethod("close", &Chip::Close)
  });

  constructor = Napi::Persistent(func);
  constructor.SuppressDestruct();

  exports.Set("Chip", func);
  return exports;
}

Chip::Chip(const Napi::CallbackInfo& info) : Napi::ObjectWrap<Chip>(info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (info.Length() < 1 || !info[0].IsString()) {
    Napi::TypeError::New(env, "String expected for chip name").ThrowAsJavaScriptException();
    return;
  }

  name_ = info[0].As<Napi::String>().Utf8Value();

  try {
    chip_ = std::make_shared<gpiod::chip>(name_);
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to open GPIO chip: " + std::string(e.what())).ThrowAsJavaScriptException();
    return;
  }
}

Chip::~Chip() {
  if (chip_) {
    try {
      chip_.reset();
    } catch (...) {
      // Ignore exceptions in destructor
    }
  }
}

Napi::Value Chip::GetNumLines(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!chip_) {
    Napi::Error::New(env, "Chip is closed").ThrowAsJavaScriptException();
    return env.Null();
  }

  try {
    // Get the chip info and then call num_lines() on it
    gpiod::chip_info chip_info = chip_->get_info();
    return Napi::Number::New(env, chip_info.num_lines());
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to get number of lines: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value Chip::Close(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!chip_) {
    return env.Undefined();
  }

  try {
    chip_.reset();
    return env.Undefined();
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to close chip: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Undefined();
  }
}

std::shared_ptr<gpiod::chip> Chip::GetChip() const {
  return chip_;
}

Napi::Value Chip::GetLineInfo(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!chip_) {
    Napi::Error::New(env, "Chip is closed").ThrowAsJavaScriptException();
    return env.Null();
  }

  if (info.Length() < 1 || !info[0].IsNumber()) {
    Napi::TypeError::New(env, "Number expected for line offset").ThrowAsJavaScriptException();
    return env.Null();
  }

  unsigned int offset = info[0].As<Napi::Number>().Uint32Value();

  try {
    // Get the line info
    gpiod::line_info line_info = chip_->get_line_info(offset);

    // Create a JavaScript object to return the line info
    Napi::Object result = Napi::Object::New(env);
    
    // Add properties to the result object
    result.Set("name", Napi::String::New(env, line_info.name()));
    result.Set("used", Napi::Boolean::New(env, line_info.used()));
    
    // Convert direction to string
    std::string direction;
    switch (line_info.direction()) {
      case gpiod::line::direction::INPUT:
        direction = "input";
        break;
      case gpiod::line::direction::OUTPUT:
        direction = "output";
        break;
      default:
        direction = "unknown";
    }
    result.Set("direction", Napi::String::New(env, direction));
    
    result.Set("activeLow", Napi::Boolean::New(env, line_info.active_low()));
    
    // Consumer might be empty
    std::string consumer = line_info.consumer();
    result.Set("consumer", Napi::String::New(env, consumer.empty() ? "unused" : consumer));
    
    return result;
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to get line info: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Null();
  }
}

Napi::Value Chip::GetLabel(const Napi::CallbackInfo& info) {
  Napi::Env env = info.Env();
  Napi::HandleScope scope(env);

  if (!chip_) {
    Napi::Error::New(env, "Chip is closed").ThrowAsJavaScriptException();
    return env.Null();
  }

  try {
    // Get the chip info
    gpiod::chip_info chip_info = chip_->get_info();
    
    // Return the label
    return Napi::String::New(env, chip_info.label());
  } catch (const std::exception& e) {
    Napi::Error::New(env, "Failed to get chip label: " + std::string(e.what())).ThrowAsJavaScriptException();
    return env.Null();
  }
}
