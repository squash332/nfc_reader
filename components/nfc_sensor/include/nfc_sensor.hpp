#pragma once

#include "pn532_driver_spi.h"
#include "esp_log.h"

class PN532
{
public:
    PN532() = default;
    ~PN532();
    esp_err_t init_module_and_bus();

    esp_err_t authenticateBlock(pn532_io_handle_t io_handle, uint8_t page, uint8_t *key, uint8_t *uid, uint8_t uid_length);
    esp_err_t readBlock(pn532_io_handle_t io_handle, uint8_t block, uint8_t *buffer, size_t buffer_len);

    bool authenticated = false;
    bool readCard();
    pn532_io_t io_handle;

    char uid_string[32] = {0};
private:
};
