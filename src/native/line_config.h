#ifndef LINE_CONFIG_H
#define LINE_CONFIG_H

#include <napi.h>
#include <gpiod.hpp>
#include <memory>
#include <string>
#include <map>

class LineConfig : public Napi::ObjectWrap<LineConfig> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  static Napi::FunctionReference constructor;

  LineConfig(const Napi::CallbackInfo& info);
  ~LineConfig();

  // Wrapped methods
  Napi::Value SetOffset(const Napi::CallbackInfo& info);
  Napi::Value SetDirection(const Napi::CallbackInfo& info);
  Napi::Value SetEdge(const Napi::CallbackInfo& info);
  Napi::Value SetDrive(const Napi::CallbackInfo& info);
  Napi::Value SetBias(const Napi::CallbackInfo& info);
  Napi::Value SetActiveLow(const Napi::CallbackInfo& info);
  Napi::Value SetOutputValue(const Napi::CallbackInfo& info);
  Napi::Value SetDebouncePeriod(const Napi::CallbackInfo& info);

  // Internal methods
  std::shared_ptr<gpiod::line_config> GetConfig() const;

private:
  std::shared_ptr<gpiod::line_config> config_;
  std::map<unsigned int, std::shared_ptr<gpiod::line_settings>> settings_map_;
  unsigned int current_offset_ = 0; // Default offset is 0
  
  // Helper to ensure settings exist for the current offset
  std::shared_ptr<gpiod::line_settings> EnsureSettingsForCurrentOffset();
};

#endif // LINE_CONFIG_H
