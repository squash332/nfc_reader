#pragma once

#include "wifi.hpp"
#include "esp_http_client.h"
#include "cJSON_Utils.h"
#include <string.h>

void http_init();
void send_POST(const char *uid, const char *name);