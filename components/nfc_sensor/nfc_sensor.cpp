#include "nfc_sensor.hpp"
#include "board_spi_gpio.hpp"
#include <pn532.h>

#define PN532_COMMAND_BUFFER_LEN 64
static const char *TAG = "PN532";
static uint8_t pn532_packetbuffer[PN532_COMMAND_BUFFER_LEN];

esp_err_t PN532::init_module_and_bus()
{
    esp_err_t ret = pn532_new_driver_spi(
        NFC_MISO,
        NFC_MOSI,
        NFC_SCK,
        NFC_CS,
        NFC_RESET,
        NFC_IRQ,
        NFC_SPI_HOST,
        NFC_CLOCK_FREQ,
        &io_handle);
    if (ret != ESP_OK)
        return ret;

    ret = pn532_init(&io_handle);
    if (ret != ESP_OK)
        return ret;

    return ESP_OK;
}

PN532::~PN532()
{

    pn532_release(&io_handle);
    pn532_delete_driver(&io_handle);
}

uint8_t *PN532::getKeyA(uint8_t sector)
{
    return keyA;
}

uint8_t *PN532::getUID()
{
    return uid;
}

uint8_t PN532::getUIDLength()
{
    return uid_length;
}

/**
 * Authenticates 4 blocks in a sector
 */
esp_err_t PN532::authenticateSectorUsingTrailerBlock(uint8_t sector)
{
    uint8_t trailer_block = sector * 4 + 3;
    pn532_packetbuffer[0] = PN532_COMMAND_INDATAEXCHANGE;
    pn532_packetbuffer[1] = 1;
    pn532_packetbuffer[2] = MIFARE_CMD_AUTH_A;
    pn532_packetbuffer[3] = trailer_block;
    memcpy(&pn532_packetbuffer[4], keyA, 6);

    memcpy(&pn532_packetbuffer[10], uid, uid_length);


    esp_err_t err = pn532_send_command_wait_ack(
        &io_handle,
        pn532_packetbuffer,
        10 + uid_length,
        PN532_WRITE_TIMEOUT);

    if (err != ESP_OK)
        return err;

    err = pn532_wait_ready(&io_handle, PN532_READ_TIMEOUT);
    if (err != ESP_OK)
        return err;

    err = pn532_read_data(
        &io_handle,
        pn532_packetbuffer,
        sizeof(pn532_packetbuffer),
        PN532_READ_TIMEOUT);

    if (err != ESP_OK)
        return err;

    uint8_t status = pn532_packetbuffer[7];

    if ((status & 0x3F) != 0x00)
    {
        ESP_LOGE(TAG, "Auth failed (status=0x%02X)", status);
        return ESP_FAIL;
    }

    return ESP_OK;
}
/**
 * Function which reads a MIFARE 1K blocks
 * @param block Block to read (numbered 0-63)
 * @param *buffer Pointer to where data will be stored
 * @param buffer_len must be >= 16
 */
esp_err_t PN532::readBlock(uint8_t block, uint8_t *buffer, size_t buffer_len)
{
    if (buffer == NULL || buffer_len == 0)
    {
        ESP_LOGD(TAG, "Invalid buffer for Classic read");
        return ESP_ERR_INVALID_ARG;
    }

    if (buffer_len < 16)
    {
        ESP_LOGE(TAG, "Classic read buffer too small: %d", buffer_len);
        return ESP_ERR_INVALID_SIZE;
    }

    pn532_packetbuffer[0] = PN532_COMMAND_INDATAEXCHANGE;
    pn532_packetbuffer[1] = 1;               /* Card number */
    pn532_packetbuffer[2] = MIFARE_CMD_READ; /* Classic Read command = 0x30 */
    pn532_packetbuffer[3] = block;

    esp_err_t err = pn532_send_command_wait_ack(&io_handle, pn532_packetbuffer, 4, PN532_WRITE_TIMEOUT);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue classic read");
        return err;
    }

    err = pn532_wait_ready(&io_handle, 100);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Classic read timeout");
        return err;
    }

    err = pn532_read_data(&io_handle, pn532_packetbuffer, 26, PN532_READ_TIMEOUT);
    if (err != ESP_OK)
    {
        return err;
    }

    uint8_t status = pn532_packetbuffer[7];
    if ((status & 0x3F) != 0x00)
    {
        ESP_LOGE(TAG, "Classic read status error: 0x%02x", status);
        return ESP_FAIL;
    }

    memcpy(buffer, pn532_packetbuffer + 8, 16);

    return ESP_OK;
}

bool PN532::readCard()
{
    if (pn532_read_passive_target_id(
            &io_handle,
            PN532_BRTY_ISO14443A_106KBPS,
            uid,
            &uid_length,
            1000) != ESP_OK)
    {
        return false;
    }
    ESP_LOGI(TAG, "UID length: %d", uid_length);
    ESP_LOG_BUFFER_HEX_LEVEL(TAG, uid, uid_length, ESP_LOG_INFO);

    if (uid_length != 4)
    {
        ESP_LOGW(TAG, "Not MIFARE Classic");
        return false;
    }

    memset(uid_string, 0, sizeof(uid_string));
    for (int i = 0; i < uid_length; i++)
    {
        sprintf(uid_string + strlen(uid_string), "%02X", uid[i]);
    }

    // for now we only care about UID
    return true;
}

bool PN532::exchangeDataWithPhone()
{
    if (pn532_in_list_passive_target(&io_handle) != ESP_OK) {
        ESP_LOGE(TAG, "Nothing to scan");
        return false;
    }


    // AID matches the one in the app
    uint8_t selectAid[] = {
        0x00, 0xA4, 0x04, 0x00,
        0x07,
        0xF0, 0x01, 0x02, 0x03, 0x04, 0x05, 0x06
    };
    uint8_t response[32];
    uint8_t responseLen = sizeof(response);

    if (pn532_in_data_exchange(&io_handle,
            selectAid, sizeof(selectAid),
            response, &responseLen) != ESP_OK)
    {
        ESP_LOGE(TAG, "SELECT AID failed");
        return false;
    }

    // GET UID — custom command, phone responds with stored UID + 90 00
    uint8_t getUid[] = { 0x00, 0xB0, 0x00, 0x00, 0x00 };
    responseLen = sizeof(response);

    if (pn532_in_data_exchange(&io_handle,
            getUid, sizeof(getUid),
            response, &responseLen) != ESP_OK)
    {
        ESP_LOGE(TAG, "GET UID failed");
        return false;
    }

    // response: <uid bytes> 90 00 — strip trailing status bytes
    if (responseLen < 3)
    {
        ESP_LOGE(TAG, "Response too short: %d", responseLen);
        return false;
    }

    uid_length = responseLen - 2;
    memcpy(uid, response, uid_length);

    memset(uid_string, 0, sizeof(uid_string));
    for (int i = 0; i < uid_length; i++)
        sprintf(uid_string + strlen(uid_string), "%02X", uid[i]);

    ESP_LOGI(TAG, "Phone UID: %s", uid_string);
    return true;
}

/**
 * Write to a certain block of a certain sector
 * @param sector The sector we are writing to
 * @param block The block we are writing to
 * @param data Pointer to a 16-byte array
 */
esp_err_t PN532::writeBlock(uint8_t sector, uint8_t block_within_sector, const uint8_t *data)
{   
    // dont yet allow writing to sector trailers
    if (block_within_sector == 3)
    {
        ESP_LOGE(TAG, "Invalid block: %d (sector trailer is protected)", block_within_sector);
        return ESP_ERR_INVALID_ARG;
    }

    if (data == NULL)
    {
        ESP_LOGE(TAG, "invalid data pointer for WRITE");
        return ESP_ERR_INVALID_ARG;
    }

    uint8_t target_block = sector * 4 + block_within_sector;
    if (authenticateSectorUsingTrailerBlock(sector) != ESP_OK)
    {
        ESP_LOGE(TAG, "Auth failed for sector %d", sector);
        return ESP_FAIL;
    }
    pn532_packetbuffer[0] = PN532_COMMAND_INDATAEXCHANGE;
    pn532_packetbuffer[1] = 1;
    pn532_packetbuffer[2] = MIFARE_CMD_WRITE;
    pn532_packetbuffer[3] = target_block;
    memcpy(pn532_packetbuffer + 4, data, 16);
    esp_err_t err = pn532_send_command_wait_ack(&io_handle, pn532_packetbuffer, 20, PN532_WRITE_TIMEOUT);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue classic write");
        return err;
    }
    err = pn532_wait_ready(&io_handle, 100);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Classic read timeout");
        return err;
    }
    err = pn532_read_data(&io_handle, pn532_packetbuffer, 26, PN532_READ_TIMEOUT);
    if (err != ESP_OK)
    {
        return err;
    }
    uint8_t status = pn532_packetbuffer[7];
    if ((status & 0x3F) != 0x00)
    {
        ESP_LOGE(TAG, "Classic write status error: 0x%02x", status);
        return ESP_FAIL;
    }
    return ESP_OK;
}

esp_err_t PN532::writeBlock(uint8_t sector, uint8_t block_within_sector, const char *str)
{
    if (str == NULL)
    {
        ESP_LOGE(TAG, "invalid string pointer");
        return ESP_ERR_INVALID_ARG;
    }

    uint8_t buffer[16] = {0};

    size_t len = strlen(str);
    if (len > 16)
    {
        ESP_LOGW(TAG, "String too long, truncating to 16 bytes");
        len = 16;
    }

    memcpy(buffer, str, len);

    return writeBlock(sector, block_within_sector, buffer);
}

void PN532::readAllBlocks()
{
    uint8_t data[16];

    for (uint8_t sector = 0; sector < 16; sector++)
    {
        ESP_LOGI(TAG, "Authenticating sector %d", sector);

        if (authenticateSectorUsingTrailerBlock(sector) != ESP_OK)
        {
            ESP_LOGE(TAG, "Auth failed sector %d", sector);
            continue;
        }

        for (uint8_t i = 0; i < 3; i++)
        {
            uint8_t block = sector * 4 + i;

            if (readBlock(block, data, sizeof(data)) == ESP_OK)
            {
                ESP_LOGI(TAG, "Block %d:", block);
                ESP_LOG_BUFFER_HEXDUMP(TAG, data, 16, ESP_LOG_INFO);
            }
            else
            {
                ESP_LOGE(TAG, "Read fail block %d", block);
            }
        }
    }
}

void PN532::printBlock(uint8_t sector, uint8_t block)
{
    uint8_t data[16];

    ESP_LOGI(TAG, "Reading block %d (sector %d)", block, sector);

    if (authenticateSectorUsingTrailerBlock(sector) != ESP_OK)
    {
        ESP_LOGE(TAG, "Auth failed for sector %d", sector);
        return;
    }

    if (readBlock(block, data, sizeof(data)) != ESP_OK)
    {
        ESP_LOGE(TAG, "Read failed for block %d", block);
        return;
    }

    ESP_LOGI(TAG, "Block %d data:", block);
    ESP_LOG_BUFFER_HEXDUMP(TAG, data, 16, ESP_LOG_INFO);
}
