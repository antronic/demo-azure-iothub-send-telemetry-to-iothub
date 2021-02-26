require('dotenv').config()

import { Mqtt } from 'azure-iot-device-mqtt'
import { Client as DeviceClient } from 'azure-iot-device'
import { Message } from 'azure-iot-device'

import { provisionDevice, provisionGroupDevice, provisionX509Device } from './dps'

// Using the Azure CLI:
// az iot hub device-identity show-connection-string --hub-name {YourIoTHubName} --device-id MyNodeDevice --output table
let connectionString: string = process.env.DEVICE_CONNECTION_STRING || '{YOUR_DEVICE_CONNECTION_STRING}'

const symmetricKey = process.env.IOTHUB_DEVICE_DPS_DEVICE_KEY || ''

const modelIdObject = {
  // modelId: 'dtmi:jirachaiWorld:myIotSimulation5y6;1'
}

// -------------------
function randomRange(lowest: number, highest: number) {
  return parseFloat((Math.random() * (highest - lowest) + lowest).toFixed(2))
}
// -------------------

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

// Create the message for send to IoT Hub
function createMessage(): Message {
  const bodyTemp = randomRange(LOWEST_BODYTEMP, HIGHEST_BODYTEMP)
  const distance = randomRange(LOWEST_DISTANCE, HIGHEST_DISTANCE)

  const message = new Message(JSON.stringify({ bodyTemp, distance }))

  // Add a custom application property to the message.
  // An IoT hub can filter on these properties without access to the message body.
  message.properties.add('highTempAlert', bodyTemp > 37.5 ? 'true' : 'false')
  message.contentType = 'application/json'
  message.contentEncoding = 'utf-8'

  return message
}

// Send the message to IoT Hub via initated client
function sendMessage(client: DeviceClient) {
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

// ---------------------------------------------------------------------------------------

// Receive message from IoT Hub
function listenMessageFromCloud(client: DeviceClient) {
  client.on('message', (message) => {
    console.log('------------------------')
    console.log('- Incoming messagr from IoT Hub')
    console.log(message.data.toString())
    console.log('------------------------')

    // Verify incoming message
    client.complete(message, (error) => {
      if (error) {
        console.error('Could not settle message:', error.toString())
      } else {
        console.log('Message accepted')
      }
    })

    // Try to convert incoming message to JSON
    try {
      const json = JSON.parse(message.data.toString())

      if (json.command && json.command === 'greeting') {
        console.log('Hello everyone! :D 🎉')
      }

      if (json.command && json.command === 'shutdown') {
        console.log('Good bye! 👋')
        process.exit(0)
      }
    } catch (error) {
      console.error('X Incomming message is not JSON format.')
    }

    console.log()
  })
}


// ---------------------------------------------------------------------------------------

// Main function for start the application
async function main() {
  // For enroll as individual
  // connectionString = await provisionDevice(symmetricKey)

  // For enroll as the group
  // connectionString = await provisionGroupDevice()

  // For enroll with X.509 certificate
  const { connectionString, deviceCert } = await provisionX509Device()

  console.log(connectionString)
  console.log()

  const client: DeviceClient = DeviceClient.fromConnectionString(connectionString, Mqtt)

  // client.setOptions(modelIdObject)

  // For auth with X.509 certificate
  client.setOptions(deviceCert)


  await client.open()

  // Receive message from IoT Hub
  listenMessageFromCloud(client)

  // Send the message with interval
  sendMessage(client)
  setInterval(() => sendMessage(client), 10000)
}

main()