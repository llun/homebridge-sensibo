const REFRESH_THRESHOLD = 2000

// 3.0V (logical full capacity)
const BATTERY_MAX_VOLTAGE = 3000
// 2.6V (estimated)
const BATTERY_MIN_VOLTAGE = 2600

const TEMPERATURE_UNIT_CELSIUS = 'C'
const TEMPERATURE_UNIT_FAHRENHEIT = 'F'

const MODE_COOL = 'cool'
const MODE_DRY = 'dry'
const MODE_HEAT = 'heat'
const MODE_FAN = 'fan'

const FAN_LEVEL_HIGH = 'high'
const FAN_LEVEL_MEDIUM = 'medium'
const FAN_LEVEL_LOW = 'low'
const FAN_LEVEL_AUTO = 'auto'

module.exports = function (Accessory, Service, Characteristic, uuid) {
  class SensiboPodAccessory extends Accessory {
    constructor (platform, device) {
      super(device.room.name, uuid.generate(`hbdev:sensibo:pod:${device.id}`))
      this.device = device
      this.name = device.room.name
      this.platform = platform
      this.log = platform.log
      this.debug = platform.debug
      this.deviceGroup = 'pods'
      this.state = {
        targetTemperature: 26,
        temperatureUnit: TEMPERATURE_UNIT_CELSIUS,
        on: false,
        mode: MODE_COOL,
        fanLevel: FAN_LEVEL_AUTO
      }
      this.sensor = { temperature: 16, humidity: 0, batteryVoltage: 2600 }
      this.coolingThresholdTemperature = 24
      const informationService = this.getService(Service.AccessoryInformation)
      informationService.setCharacteristic(
        Characteristic.Manufacturer,
        'homebridge-sensibo'
      )
      informationService.setCharacteristic(Characteristic.Model, '0.3.0')
      informationService.setCharacteristic(
        Characteristic.SerialNumber,
        this.device.id
      )
      this
        .addService(Service.HumiditySensor)
        .getCharacteristic(Characteristic.CurrentRelativeHumidity)
        .on(
          'get',
          callback => callback(null, Math.round(this.sensor.humidity))
        )
      this
        .addService(Service.TemperatureSensor)
        .getCharacteristic(Characteristic.CurrentTemperature)
        .on(
          'get',
          callback => callback(null, Math.round(this.sensor.temperature))
        )
      this
        .addService(Service.HeaterCooler)
        .getCharacteristic(Characteristic.Active)
        .on('get', callback => callback(null, this.state.on))
        .on('set', (value, callback) => {
        })
      this.loadData()
    }

    loadData () {
      this.refreshAll().then(() => {
        this.services
          .reduce(
            (out, service) => {
              return out.concat(service.characteristics)
            },
            []
          )
          .forEach(characteristic => {
            characteristic.getValue()
          })
      })
    }

    getServices () {
      return this.services
    }

    refreshAll () {
      return Promise.all([ this.refreshState(), this.refreshSensor() ])
    }

    refreshState () {
      const now = Date.now()
      if (
        this.state.updateTime && now - this.state.updateTime < REFRESH_THRESHOLD
      ) {
        return Promise.resolve()
      }

      return this.platform.api.getState(this.device.id).then(state => {
        if (!state) return
        this.state = Object.assign({}, state, { updateTime: now })
      })
    }

    refreshSensor () {
      const now = Date.now()
      if (this.sensor.updateTime && now - this.sensor.updateTime < 2000) {
        return Promise.resolve()
      }

      return this.platform.api.getMeasurements(this.device.id).then(data => {
        if (!data) return
        this.sensor = Object.assign({}, data[0], { updateTime: now })
      })
    }

    identify () {
      this.log(`Idenfity! (name: ${this.name})`)
    }

    logStateChange () {
      this.log(
        `Changed status (name: ${this.name}, temperature: ${this.sensor.temperature}, on: ${this.state.on}, mode: ${this.state.mode}, targetTemperature: ${this.state.targetTemperature}, fan speed: ${this.state.fanLevel})`
      )
    }
  }

  module.exports.SensiboPodAccessory = SensiboPodAccessory

  module.exports.REFRESH_THRESHOLD = REFRESH_THRESHOLD

  module.exports.BATTERY_MAX_VOLTAGE = BATTERY_MAX_VOLTAGE
  module.exports.BATTERY_MIN_VOLTAGE = BATTERY_MIN_VOLTAGE

  module.exports.TEMPERATURE_UNIT_CELSIUS = TEMPERATURE_UNIT_CELSIUS
  module.exports.TEMPERATURE_UNIT_FAHRENHEIT = TEMPERATURE_UNIT_FAHRENHEIT

  module.exports.MODE_COOL = MODE_COOL
  module.exports.MODE_DRY = MODE_DRY
  module.exports.MODE_HEAT = MODE_HEAT
  module.exports.MODE_FAN = MODE_FAN

  module.exports.FAN_LEVEL_HIGH = FAN_LEVEL_HIGH
  module.exports.FAN_LEVEL_MEDIUM = FAN_LEVEL_MEDIUM
  module.exports.FAN_LEVEL_LOW = FAN_LEVEL_LOW
  module.exports.FAN_LEVEL_AUTO = FAN_LEVEL_AUTO

  return SensiboPodAccessory
}
