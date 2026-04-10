#pragma once

#include "pn532_driver_spi.h"
#include "esp_log.h"


class PN532 {
    public:
        PN532();
        ~PN532();
        esp_err_t init_module_and_bus();

    private:
        pn532_io_handle_t io_handle;
};
