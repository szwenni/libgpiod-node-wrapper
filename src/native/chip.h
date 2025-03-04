#ifndef CHIP_H
#define CHIP_H

#include <napi.h>
#include <gpiod.hpp>
#include <memory>
#include <string>

class Chip : public Napi::ObjectWrap<Chip> {
public:
  static Napi::Object Init(Napi::Env env, Napi::Object exports);
  static Napi::FunctionReference constructor;

  Chip(const Napi::CallbackInfo& info);
  ~Chip();

  // Wrapped methods
  Napi::Value GetNumLines(const Napi::CallbackInfo& info);
  Napi::Value GetLineInfo(const Napi::CallbackInfo& info);
  Napi::Value GetLabel(const Napi::CallbackInfo& info);
  Napi::Value Close(const Napi::CallbackInfo& info);

  // Internal methods
  std::shared_ptr<gpiod::chip> GetChip() const;

private:
  std::shared_ptr<gpiod::chip> chip_;
  std::string name_;
};

#endif // CHIP_H
