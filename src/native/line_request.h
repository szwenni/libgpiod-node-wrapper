#ifndef LINE_REQUEST_H
#define LINE_REQUEST_H

#include <napi.h>
#include <gpiod.hpp>
#include <memory>
#include <vector>
#include "chip.h"
#include "line_config.h"

class LineRequest : public Napi::ObjectWrap<LineRequest> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  static Napi::FunctionReference constructor;

  LineRequest(const Napi::CallbackInfo& info);
  ~LineRequest();

  // Wrapped methods
  Napi::Value GetValue(const Napi::CallbackInfo& info);
  Napi::Value SetValue(const Napi::CallbackInfo& info);
  Napi::Value Release(const Napi::CallbackInfo& info);

  // Internal methods
  std::shared_ptr<gpiod::line_request> GetRequest() const;

private:
  std::shared_ptr<Chip> chip_;
  std::shared_ptr<LineConfig> config_;
  std::vector<unsigned int> offsets_;
  std::shared_ptr<gpiod::line_request> request_;
};

#endif // LINE_REQUEST_H
