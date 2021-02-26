require('dotenv').config()

import { Mqtt } from 'azure-iot-device-mqtt'
import { Client as DeviceClient } from 'azure-iot-device'
import { Message } from 'azure-iot-device'

// Using the Azure CLI:
// az iot hub device-identity show-connection-string --hub-name {YourIoTHubName} --device-id MyNodeDevice --output table
const connectionString: string = process.env.DEVICE_CONNECTION_STRING || '{YOUR_DEVICE_CONNECTION_STRING}'
const client: DeviceClient = DeviceClient.fromConnectionString(connectionString, Mqtt)

// -------------------
function randomRange(lowest: number, highest: number) {
  return Math.random() * (highest - lowest) + lowest
}

// ----------------------
// --- Temperature Range
// ----------------------
const LOWEST_BODYTEMP = 35
const HIGHEST_BODYTEMP = 40

// ----------------------
// --- Humidity Range
// ----------------------
const LOWEST_DISTANCE = 10
const HIGHEST_DISTANCE = 30

function createMessage(): Message {
  const bodyTemp = randomRange(LOWEST_BODYTEMP, HIGHEST_BODYTEMP)
  const distance = randomRange(LOWEST_DISTANCE, HIGHEST_DISTANCE)

  const message = new Message(JSON.stringify({ bodyTemp, distance }))

  // Add a custom application property to the message.
  // An IoT hub can filter on these properties without access to the message body.
  message.properties.add('highTempAlert', bodyTemp > 37.5 ? 'true' : 'false')

  return message
}

function sendMessage() {
  // Create sample random message
  const message = createMessage()

  // Send the message
  client.sendEvent(message, (err) => {
    if (err) {
      console.log('Send error:', err.toString())
    } else {
      console.log('Message Sent!')
    }
  })
}

function main() {
  sendMessage()
  setInterval(sendMessage, 10000)
}

main()