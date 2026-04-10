#pragma once

#include "driver/gpio.h"
#include "driver/spi_master.h"

constexpr gpio_num_t NFC_MISO  = (GPIO_NUM_13);
constexpr gpio_num_t NFC_MOSI  = GPIO_NUM_11;
constexpr gpio_num_t NFC_SCK   = GPIO_NUM_12;
constexpr gpio_num_t NFC_CS    = GPIO_NUM_10;
constexpr gpio_num_t NFC_RESET = GPIO_NUM_NC;
constexpr gpio_num_t NFC_IRQ   = GPIO_NUM_NC;

constexpr spi_host_device_t NFC_SPI_HOST = SPI3_HOST;
constexpr int32_t NFC_CLOCK_FREQ = 1000000;