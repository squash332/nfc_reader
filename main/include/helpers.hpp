#pragma once 

#include <stdio.h>
#include "esp_log.h"
#include "wifi.hpp"
#include "http_client.hpp"
#include "nfc_sensor.hpp"
#include <pn532.h>
#include "camera.hpp"


void app_init();
void sendBufferTask(void *arg); 

extern Camera *cam;
static TaskHandle_t sendBufferHandle;
extern QueueHandle_t imgBufferQueue;