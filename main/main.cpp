#include "helpers.hpp"
#include <esp_timer.h>

static const char *TAG = "MAIN";

extern "C" void app_main()
{
    app_init();
    Camera cam{};

    while (true)
    {
        if (!http_client_active())
        {
            if (camera_is_enabled())
            {
                http_init();
                ESP_LOGI(TAG, "Camera re-enabled, resuming");
            }
            else
            {
                vTaskDelay(pdMS_TO_TICKS(5000));
            }
            continue;
        }

        ESP_LOGW(TAG, "CAPTURING...");
        auto frame = cam.capture();
        if (!frame.empty())
        {
            int64_t start  = esp_timer_get_time();
            int     result = send_frame(frame.data(), frame.size());
            int64_t elapsed = (esp_timer_get_time() - start) / 1000;

            if (result == -1)
            {
                ESP_LOGW(TAG, "Camera disabled, entering poll mode");
                vTaskDelay(pdMS_TO_TICKS(4000));
                continue;
            }

            ESP_LOGI(TAG, "Send took: %lld ms (%zu bytes)", elapsed, frame.size());
            ESP_LOGI(TAG, "CAPTURED FRAME!");
        }

        vTaskDelay(pdMS_TO_TICKS(75));
    }
}
