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
            bool ok = send_frame(frame.data(), frame.size());
            int64_t elapsed = (esp_timer_get_time() - start) / 1000;
            if (!ok)
                ESP_LOGW(TAG, "send failed (%lld ms)", elapsed);
        }

        vTaskDelay(pdMS_TO_TICKS(75));
    }
}
