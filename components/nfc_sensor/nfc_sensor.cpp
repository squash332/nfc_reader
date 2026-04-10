#include "nfc_sensor.hpp"
#include "board_spi_gpio.hpp"


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


void PN532::readCard() {

}