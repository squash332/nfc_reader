#pragma once

#include "pn532_driver_spi.h"
#include "esp_log.h"

class PN532
{
public:
    PN532() = default;
    ~PN532();
    esp_err_t init_module_and_bus();

    esp_err_t authenticateSectorUsingTrailerBlock(uint8_t sector);
    esp_err_t readBlock(uint8_t block, uint8_t *buffer, size_t buffer_len);
    esp_err_t writeBlock(uint8_t sector, uint8_t block, const uint8_t *data);
    uint8_t *getKeyA(uint8_t sector);
    uint8_t *getUID();
    uint8_t getUIDLength();
    void readAllBlocks();
    void printBlock(uint8_t sector, uint8_t block);
    esp_err_t writeBlock(uint8_t sector, uint8_t block_within_sector, const char *str);

    bool readCard();
    bool exchangeDataWithPhone();
    
    char uid_string[32] = {0};
    
    private:
        pn532_io_t io_handle;
        uint8_t keyA[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
        uint8_t uid[7] = {0};
        uint8_t uid_length = 0;
};
