#pragma once

#include "pn532_driver_spi.h"


class PN532 {
    public:
        PN532() = default;
        ~PN532() = default;

        esp_err_t spi_init();

    private:
        pn532_io_handle_t io_handle;
};
