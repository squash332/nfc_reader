#pragma once 

#include "esp_wifi.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "esp_event.h"

#define MAX_FAILURES 10

#define WIFI_SUCCESS BIT0
#define WIFI_FAILURE BIT1
#define EXAMPLE_ESP_WIFI_SSID "ex"
#define EXAMPLE_ESP_WIFI_PASS "ex"

esp_err_t nvs_init();
esp_err_t wifi_init_sta();
