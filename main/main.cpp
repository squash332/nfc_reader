#include "helpers.hpp"
#include <esp_timer.h>

static const char *TAG = "MAIN";

extern "C" void app_main()
{
    app_init();
    Camera cam{};

    while (true)
    {

        auto frame = cam.capture();
        if (!frame.empty())
        {
            int64_t start = esp_timer_get_time();
            send_frame(frame.data(), frame.size());
            int64_t elapsed = (esp_timer_get_time() - start) / 1000;
            ESP_LOGI(TAG, "Send took: %lld ms (%zu bytes)", elapsed, frame.size());

        }

        vTaskDelay(pdMS_TO_TICKS(75));
    }
}
