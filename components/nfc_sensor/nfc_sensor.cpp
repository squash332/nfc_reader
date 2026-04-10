#include "nfc_sensor.hpp"
#include "board_spi_gpio.hpp"

esp_err_t PN532::spi_init()
{
    return pn532_new_driver_spi(
        NFC_MISO,
        NFC_MOSI,
        NFC_SCK,
        NFC_CS,
        NFC_RESET,
        NFC_IRQ,
        NFC_SPI_HOST,
        NFC_CLOCK_FREQ,
        io_handle);
}