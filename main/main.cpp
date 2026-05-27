#include "esp_log.h"
#include "freertos/FreeRTOS.h"
#include "freertos/task.h"
#include "wifi.hpp"
#include "http_client.hpp"
#include "nfc_sensor.hpp"
#include <pn532.h>
#include "camera.hpp"

static const char *TAG = "MAIN";

static Camera    *g_cam       = nullptr;
static volatile bool g_streaming = false;

static void camera_task(void *)
{
    while (g_cam == nullptr)
        vTaskDelay(pdMS_TO_TICKS(100));

    ESP_LOGI(TAG, "Camera task ready");

    uint32_t frames_sent = 0;

    while (true)
    {
        if (g_streaming)
        {
            g_cam->stream_frame([](const uint8_t *buf, size_t len) {
                send_frame(buf, len);
            });

            frames_sent++;

            // Check if backend says stop every ~2 s (every 10 frames at 5 fps)
            if (frames_sent % 10 == 0 && !poll_camera_active())
            {
                ESP_LOGI(TAG, "Backend stopped streaming");
                g_streaming  = false;
                frames_sent = 0;
            }

            vTaskDelay(pdMS_TO_TICKS(200)); // ~5 fps
        }
        else
        {
            frames_sent = 0;

            // Poll backend for a start command every 500 ms
            if (poll_camera_active())
            {
                ESP_LOGI(TAG, "Backend triggered stream");
                g_streaming = true;
            }

            vTaskDelay(pdMS_TO_TICKS(500));
        }
    }
}

static void trigger_camera()
{
    if (!g_streaming)
    {
        g_streaming = true;
        notify_camera_start(); // tell backend so UI can open the stream
    }
}

extern "C" void app_main()
{
    nvs_init();
    esp_err_t wifi_status = wifi_init_sta();
    http_init();

    Camera cam{};
    g_cam = &cam;

    xTaskCreate(camera_task, "cam_task", 4096, NULL, 5, NULL);

    PN532 pn532;
    while (pn532.init_module_and_bus() != ESP_OK)
    {
        ESP_LOGE(TAG, "PN532 init failed, retrying...");
        vTaskDelay(pdMS_TO_TICKS(1000));
    }
    ESP_LOGI(TAG, "PN532 init success!");

    while (true)
    {
        if (wifi_status == WIFI_SUCCESS)
        {
            if (pn532.exchangeDataWithPhone())
            {
                send_POST(pn532.uid_string);
                trigger_camera(); // someone tapped their phone — show the feed
            }
            else if (pn532.readCard())
            {
                send_POST(pn532.uid_string);
                trigger_camera(); // card scanned — show the feed
                vTaskDelay(pdMS_TO_TICKS(1500));
            }
        }

        vTaskDelay(pdMS_TO_TICKS(100));
    }
}
