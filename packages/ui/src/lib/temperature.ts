/* Temperature units shared by the thermal readouts and alert rules. Readings are stored in °C; convert only for display. Pure. */

export type TemperatureUnit = "celsius" | "fahrenheit";

/** Convert °C to °F. */
export function celsiusToFahrenheit(celsius: number): number {
  return (celsius * 9) / 5 + 32;
}

/** Convert °F to °C. */
export function fahrenheitToCelsius(fahrenheit: number): number {
  return ((fahrenheit - 32) * 5) / 9;
}

/** Convert a °C reading to the display unit. */
export function toTemperatureUnit(celsius: number, unit: TemperatureUnit = "celsius"): number {
  return unit === "fahrenheit" ? celsiusToFahrenheit(celsius) : celsius;
}

/** Convert a value in the display unit back to °C. */
export function fromTemperatureUnit(value: number, unit: TemperatureUnit = "celsius"): number {
  return unit === "fahrenheit" ? fahrenheitToCelsius(value) : value;
}

/** "°C" or "°F". */
export function temperatureUnitSymbol(unit: TemperatureUnit = "celsius"): string {
  return unit === "fahrenheit" ? "°F" : "°C";
}
