#pragma once 

#include "esp_wifi.h"
#include "esp_log.h"
#include "nvs_flash.h"
#include "esp_event.h"

#define MAX_FAILURES 5

#define WIFI_SUCCESS BIT0
#define WIFI_FAILURE BIT1

esp_err_t nvs_init();
esp_err_t wifi_init_sta();
esp_err_t save_wifi_credentials(const char *ssid, const char *password);
esp_err_t load_wifi_credentials(char *ssid, char *password);
