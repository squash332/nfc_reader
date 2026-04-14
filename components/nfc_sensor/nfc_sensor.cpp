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

// auth once per sector (0,4,8,12..), then read 4 blocks (PAGES)
esp_err_t PN532::authenticateBlock(
    pn532_io_handle_t io_handle,
    uint8_t block,
    uint8_t *key,
    uint8_t *uid,
    uint8_t uid_length)
{
    pn532_packetbuffer[0] = PN532_COMMAND_INDATAEXCHANGE;
    pn532_packetbuffer[1] = 1;
    pn532_packetbuffer[2] = MIFARE_CMD_AUTH_A;
    pn532_packetbuffer[3] = block;

    memcpy(&pn532_packetbuffer[4], key, 6);

    if (uid_length > 7)
        uid_length = 7;
    memcpy(&pn532_packetbuffer[10], uid, uid_length);

    esp_err_t err = pn532_send_command_wait_ack(
        io_handle,
        pn532_packetbuffer,
        10 + uid_length,
        PN532_WRITE_TIMEOUT);

    if (err != ESP_OK)
        return err;

    err = pn532_wait_ready(io_handle, PN532_READ_TIMEOUT);
    if (err != ESP_OK)
        return err;

    err = pn532_read_data(
        io_handle,
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

esp_err_t PN532::readBlock(pn532_io_handle_t io_handle, uint8_t block, uint8_t *buffer, size_t buffer_len)
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

    esp_err_t err = pn532_send_command_wait_ack(io_handle, pn532_packetbuffer, 4, PN532_WRITE_TIMEOUT);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Failed to queue classic read");
        return err;
    }

    err = pn532_wait_ready(io_handle, 100);
    if (err != ESP_OK)
    {
        ESP_LOGE(TAG, "Classic read timeout");
        return err;
    }

    err = pn532_read_data(io_handle, pn532_packetbuffer, 26, PN532_READ_TIMEOUT);
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

void PN532::readCard()
{
    uint8_t uid[7];
    uint8_t uid_length;

    if (pn532_read_passive_target_id(
            &io_handle,
            PN532_BRTY_ISO14443A_106KBPS,
            uid,
            &uid_length,
            1000) != ESP_OK)
    {
        return;
    }

    ESP_LOGI(TAG, "UID length: %d", uid_length);
    ESP_LOG_BUFFER_HEX_LEVEL(TAG, uid, uid_length, ESP_LOG_INFO);

    if (uid_length != 4)
    {
        ESP_LOGW(TAG, "Not MIFARE Classic");
        return;
    }

    memset(uid_string, 0, sizeof(uid_string));
    for (int i = 0; i < uid_length; i++)
    {
        sprintf(uid_string + strlen(uid_string), "%02X", uid[i]);
    }

    uint8_t keyA[6] = {0xFF, 0xFF, 0xFF, 0xFF, 0xFF, 0xFF};
    uint8_t data[16];


    for (int block = 0; block < 64; block++)
    {
        if (block % 4 == 0)
        {
            authenticated = false;

            ESP_LOGI(TAG, "Authenticating sector %d", block / 4);

            if (authenticateBlock(&io_handle, block, keyA, uid, uid_length) != ESP_OK)
            {
                ESP_LOGE(TAG, "Auth failed sector %d", block / 4);
                continue;
            }

            authenticated = true;
        }

        if (!authenticated)
            continue;

        if (readBlock(&io_handle, block, data, sizeof(data)) == ESP_OK)
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
