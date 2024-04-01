const fz = require('zigbee-herdsman-converters/converters/fromZigbee');
const tz = require('zigbee-herdsman-converters/converters/toZigbee');
const exposes = require('zigbee-herdsman-converters/lib/exposes');
const reporting = require('zigbee-herdsman-converters/lib/reporting');
const e = exposes.presets;
const ea = exposes.access;

const tzLocal = {
    node_config: {
        key: ['reading_interval', 'config_report_enable', 'comparison_previous_data'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                reading_interval: ['genPowerCfg', {0x0201: {value, type: 0x21}}],
				config_report_enable: ['genPowerCfg', {0x0275: {value, type: 0x10}}],
				comparison_previous_data: ['genPowerCfg', {0x0205: {value, type: 0x10}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
	termostat_config: {
        key: ['high_temp', 'low_temp', 'enable_temp', 'invert_logic_temp'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                high_temp: ['msTemperatureMeasurement', {0x0221: {value, type: 0x29}}],
                low_temp: ['msTemperatureMeasurement', {0x0222: {value, type: 0x29}}],
				enable_temp: ['msTemperatureMeasurement', {0x0220: {value, type: 0x10}}],
				invert_logic_temp: ['msTemperatureMeasurement', {0x0225: {value, type: 0x10}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
	hydrostat_config: {
        key: ['high_hum', 'low_hum', 'enable_hum', 'invert_logic_hum'],
        convertSet: async (entity, key, rawValue, meta) => {
            const lookup = {'OFF': 0x00, 'ON': 0x01};
            const value = lookup.hasOwnProperty(rawValue) ? lookup[rawValue] : parseInt(rawValue, 10);
            const payloads = {
                high_hum: ['msRelativeHumidity', {0x0221: {value, type: 0x21}}],
                low_hum: ['msRelativeHumidity', {0x0222: {value, type: 0x21}}],
				enable_hum: ['msRelativeHumidity', {0x0220: {value, type: 0x10}}],
				invert_logic_hum: ['msRelativeHumidity', {0x0225: {value, type: 0x10}}],
            };
            await entity.write(payloads[key][0], payloads[key][1]);
            return {
                state: {[key]: rawValue},
            };
        },
    },
};

const fzLocal = {
    node_config: {
        cluster: 'genPowerCfg',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0201)) {
                result.reading_interval = msg.data[0x0201];
            }
			if (msg.data.hasOwnProperty(0x0275)) {
				result.config_report_enable = ['OFF', 'ON'][msg.data[0x0275]];
            }
			if (msg.data.hasOwnProperty(0x0205)) {
				result.comparison_previous_data = ['OFF', 'ON'][msg.data[0x0205]];
            }
            return result;
        },
    },
	termostat_config: {
        cluster: 'msTemperatureMeasurement',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0221)) {
                result.high_temp = msg.data[0x0221];
            }
			if (msg.data.hasOwnProperty(0x0222)) {
                result.low_temp = msg.data[0x0222];
            }
            if (msg.data.hasOwnProperty(0x0220)) {
                result.enable_temp = ['OFF', 'ON'][msg.data[0x0220]];
            }
			if (msg.data.hasOwnProperty(0x0225)) {
                result.invert_logic_temp = ['OFF', 'ON'][msg.data[0x0225]];
            }
			if (msg.data.hasOwnProperty(0xA19B)) {
                result.sensor_identifier = msg.data[0xA19B];
            }
            return result;
        },
    },
	hydrostat_config: {
        cluster: 'msRelativeHumidity',
        type: ['attributeReport', 'readResponse'],
        convert: (model, msg, publish, options, meta) => {
            const result = {};
            if (msg.data.hasOwnProperty(0x0221)) {
                result.high_hum = msg.data[0x0221];
            }
			if (msg.data.hasOwnProperty(0x0222)) {
                result.low_hum = msg.data[0x0222];
            }
            if (msg.data.hasOwnProperty(0x0220)) {
                result.enable_hum = ['OFF', 'ON'][msg.data[0x0220]];
            }
			if (msg.data.hasOwnProperty(0x0225)) {
                result.invert_logic_hum = ['OFF', 'ON'][msg.data[0x0225]];
            }
            return result;
        },
    },
};

const definition = {
        zigbeeModel: ['EFEKTA_TH_v1_LR'],
        model: 'EFEKTA_TH_v1_LR',
        vendor: 'EfektaLab',
        description: 'EFEKTA_TH_v1_LR - Smart temperature and humidity sensors with a signal amplifier. Thermostat and hygrostat.',
        fromZigbee: [fz.temperature, fz.humidity, fz.battery, fzLocal.termostat_config, fzLocal.hydrostat_config, fzLocal.node_config],
        toZigbee: [tz.factory_reset, tzLocal.termostat_config, tzLocal.hydrostat_config, tzLocal.node_config],
        configure: async (device, coordinatorEndpoint, logger) => {
            const endpointOne = device.getEndpoint(1);
            await reporting.bind(endpointOne, coordinatorEndpoint, ['genPowerCfg', 'msTemperatureMeasurement', 'msRelativeHumidity']);
			const overrides1 = {min: 1800, max: 43200, change: 1};
			const overrides2 = {min: 60, max: 1200, change: 1};
			const overrides3 = {min: 120, max: 2400, change: 1};
            await reporting.batteryVoltage(endpointOne, overrides1);
            await reporting.batteryPercentageRemaining(endpointOne, overrides1);
			await reporting.batteryAlarmState(endpointOne, overrides1);
            await reporting.temperature(endpointOne, overrides2);
            await reporting.humidity(endpointOne, overrides3);
        },
        icon: 'data:image/jpeg;base64,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UkdCQwAAAAMAAAAAUmQgIGRvdWJAb+AAAAAAAAAAAABHcm4gZG91YkBv4AAAAAAAAAAAAEJsICBkb3ViQG/gAAAAAAAAAAAAQnJkVFVudEYjUmx0AAAAAAAAAAAAAAAAQmxkIFVudEYjUmx0AAAAAAAAAAAAAAAAUnNsdFVudEYjUHhsQFIAAAAAAAAAAAAKdmVjdG9yRGF0YWJvb2wBAAAAAFBnUHNlbnVtAAAAAFBnUHMAAAAAUGdQQwAAAABMZWZ0VW50RiNSbHQAAAAAAAAAAAAAAABUb3AgVW50RiNSbHQAAAAAAAAAAAAAAABTY2wgVW50RiNQcmNAWQAAAAAAAAAAABBjcm9wV2hlblByaW50aW5nYm9vbAAAAAAOY3JvcFJlY3RCb3R0b21sb25nAAAAAAAAAAxjcm9wUmVjdExlZnRsb25nAAAAAAAAAA1jcm9wUmVjdFJpZ2h0bG9uZwAAAAAAAAALY3JvcFJlY3RUb3Bsb25nAAAAAAA4QklNA+0AAAAAABAASAAAAAEAAQBIAAAAAQABOEJJTQQmAAAAAAAOAAAAAAAAAAAAAD+AAAA4QklNBA0AAAAAAAQAAAAeOEJJTQQZAAAAAAAEAAAAHjhCSU0D8wAAAAAACQAAAAAAAAAAAQA4QklNJxAAAAAAAAoAAQAAAAAAAAABOEJJTQP1AAAAAABIAC9mZgABAGxmZgAGAAAAAAABAC9mZgABAKGZmgAGAAAAAAABADIAAAABAFoAAAAGAAAAAAABADUAAAABAC0AAAAGAAAAAAABOEJJTQP4AAAAAABwAAD/////////////////////////////A+gAAAAA/////////////////////////////wPoAAAAAP////////////////////////////8D6AAAAAD/////////////////////////////A+gAADhCSU0ECAAAAAAAEAAAAAEAAAJAAAACQAAAAAA4QklNBB4AAAAAAAQAAAAAOEJJTQQaAAAAAANnAAAABgAAAAAAAAAAAAAAfQAAAH0AAAAZAHAAaABvAHQAbwBfADIAMAAyADMALQAxADAALQAyADQAXwAwADEALQAxADMALQAyADMAAAABAAAAAAAAAAAAAAAAAAAAAAAAAAEAAAAAAAAAAAAAAH0AAAB9AAAAAAAAAAAA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AG8AcAAgAEMAQwAgADIAMAAxADgAAAABADhCSU0EBgAAAAAABwAEAQEAAQEA/+ENx2h0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC8APD94cGFja2V0IGJlZ2luPSLvu78iIGlkPSJXNU0wTXBDZWhpSHpyZVN6TlRjemtjOWQiPz4gPHg6eG1wbWV0YSB4bWxuczp4PSJhZG9iZTpuczptZXRhLyIgeDp4bXB0az0iQWRvYmUgWE1QIENvcmUgNS42LWMxNDIgNzkuMTYwOTI0LCAyMDE3LzA3LzEzLTAxOjA2OjM5ICAgICAgICAiPiA8cmRmOlJERiB4bWxuczpyZGY9Imh0dHA6Ly93d3cudzMub3JnLzE5OTkvMDIvMjItcmRmLXN5bnRheC1ucyMiPiA8cmRmOkRlc2NyaXB0aW9uIHJkZjphYm91dD0iIiB4bWxuczp4bXBNTT0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wL21tLyIgeG1sbnM6c3RFdnQ9Imh0dHA6Ly9ucy5hZG9iZS5jb20veGFwLzEuMC9zVHlwZS9SZXNvdXJjZUV2ZW50IyIgeG1sbnM6ZGM9Imh0dHA6Ly9wdXJsLm9yZy9kYy9lbGVtZW50cy8xLjEvIiB4bWxuczpwaG90b3Nob3A9Imh0dHA6Ly9ucy5hZG9iZS5jb20vcGhvdG9zaG9wLzEuMC8iIHhtbG5zOnhtcD0iaHR0cDovL25zLmFkb2JlLmNvbS94YXAvMS4wLyIgeG1wTU06RG9jdW1lbnRJRD0iYWRvYmU6ZG9jaWQ6cGhvdG9zaG9wOjFkOWVhNjNmLWQyODYtZjM0Zi1iZWI3LWE3ZjE0MmQxZjczZCIgeG1wTU06SW5zdGFuY2VJRD0ieG1wLmlpZDowYmRjYTY5ZS1jNTE2LTkzNGUtODc5Yi1jODA4Nzc4MjcwNGUiIHhtcE1NOk9yaWdpbmFsRG9jdW1lbnRJRD0iQjlBNDE5MTg5NjFDMzlBNUJGQ0FEMkFCMUM5QTY2MDIiIGRjOmZvcm1hdD0iaW1hZ2UvanBlZyIgcGhvdG9zaG9wOkNvbG9yTW9kZT0iMyIgcGhvdG9zaG9wOklDQ1Byb2ZpbGU9InNSR0IiIHhtcDpDcmVhdGVEYXRlPSIyMDIzLTEyLTAyVDIxOjUwOjA5KzAzOjAwIiB4bXA6TW9kaWZ5RGF0ZT0iMjAyNC0wMS0xOFQxNTo0ODozMSswMzowMCIgeG1wOk1ldGFkYXRhRGF0ZT0iMjAyNC0wMS0xOFQxNTo0ODozMSswMzowMCI+IDx4bXBNTTpIaXN0b3J5PiA8cmRmOlNlcT4gPHJkZjpsaSBzdEV2dDphY3Rpb249InNhdmVkIiBzdEV2dDppbnN0YW5jZUlEPSJ4bXAuaWlkOjY5YmYxOTNhLWM3YTItN2Y0ZS1iNDg3LWE5ZWI0MTFjMWQxMyIgc3RFdnQ6d2hlbj0iMjAyNC0wMS0xOFQxNTo0ODozMSswMzowMCIgc3RFdnQ6c29mdHdhcmVBZ2VudD0iQWRvYmUgUGhvdG9zaG9wIENDIDIwMTggKFdpbmRvd3MpIiBzdEV2dDpjaGFuZ2VkPSIvIi8+IDxyZGY6bGkgc3RFdnQ6YWN0aW9uPSJzYXZlZCIgc3RFdnQ6aW5zdGFuY2VJRD0ieG1wLmlpZDowYmRjYTY5ZS1jNTE2LTkzNGUtODc5Yi1jODA4Nzc4MjcwNGUiIHN0RXZ0OndoZW49IjIwMjQtMDEtMThUMTU6NDg6MzErMDM6MDAiIHN0RXZ0OnNvZnR3YXJlQWdlbnQ9IkFkb2JlIFBob3Rvc2hvcCBDQyAyMDE4IChXaW5kb3dzKSIgc3RFdnQ6Y2hhbmdlZD0iLyIvPiA8L3JkZjpTZXE+IDwveG1wTU06SGlzdG9yeT4gPC9yZGY6RGVzY3JpcHRpb24+IDwvcmRmOlJERj4gPC94OnhtcG1ldGE+ICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgICAgPD94cGFja2V0IGVuZD0idyI/Pv/iAihJQ0NfUFJPRklMRQABAQAAAhgAAAAA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',
		exposes: [e.temperature(), e.humidity(), e.battery_low(), e.battery(), e.battery_voltage(),
		    exposes.numeric('reading_interval', ea.STATE_SET).withUnit('Seconds').withDescription('Setting the sensor reading interval. Setting the time in seconds, by default 30 seconds')
                .withValueMin(10).withValueMax(360),
			exposes.binary('config_report_enable', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable reporting based on reporting configuration'),
		    exposes.binary('comparison_previous_data', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable сontrol of comparison with previous data'),
		    exposes.binary('enable_temp', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable Temperature Control'),
		    exposes.binary('invert_logic_temp', ea.STATE_SET, 'ON', 'OFF').withDescription('Invert Logic Temperature Control'),
            exposes.numeric('high_temp', ea.STATE_SET).withUnit('C').withDescription('Setting High Temperature Border')
                .withValueMin(-50).withValueMax(120),
            exposes.numeric('low_temp', ea.STATE_SET).withUnit('C').withDescription('Setting Low Temperature Border')
                .withValueMin(-50).withValueMax(120),				
		    exposes.binary('enable_hum', ea.STATE_SET, 'ON', 'OFF').withDescription('Enable Humidity Control'),
		    exposes.binary('invert_logic_hum', ea.STATE_SET, 'ON', 'OFF').withDescription('Invert Logoc Humidity Control'),
            exposes.numeric('high_hum', ea.STATE_SET).withUnit('C').withDescription('Setting High Humidity Border')
                .withValueMin(0).withValueMax(99),
            exposes.numeric('low_hum', ea.STATE_SET).withUnit('C').withDescription('Setting Low Humidity Border')
                .withValueMin(0).withValueMax(99),
			exposes.numeric('sensor_identifier', ea.STATE).withDescription('Sensor type, identifier')],
};

module.exports = definition;
