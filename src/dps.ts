import { Mqtt } from 'azure-iot-provisioning-device-mqtt'
import { ProvisioningDeviceClient, RegistrationResult } from 'azure-iot-provisioning-device'
import { SymmetricKeySecurityClient } from 'azure-iot-security-symmetric-key'
import { X509Security } from 'azure-iot-security-x509'

import fs from 'fs'
import path from 'path'
import crypto from 'crypto'

// DPS connection information
const provisioningHost = process.env.IOTHUB_DEVICE_DPS_ENDPOINT || 'global.azure-devices-provisioning.net'
const idScope = process.env.IOTHUB_DEVICE_DPS_ID_SCOPE || ''
const registrationId = process.env.IOTHUB_DEVICE_DPS_DEVICE_ID || ''
const useDps = process.env.IOTHUB_DEVICE_SECURITY_TYPE || ''

const certFile = process.env.CERTIFICATE_FILE || ''
const keyFile = process.env.KEY_FILE || ''

export async function provisionGroupDevice(payload?: any): Promise<string> {
  const masterKey = process.env.IOTHUB_DEVICE_DPS_DEVICE_KEY || ''

  const symmetricKey = crypto.createHmac('SHA256', Buffer.from(masterKey, 'base64'))
    .update(registrationId, 'utf8')
    .digest('base64')

  return await provisionDevice(symmetricKey, payload)
}

interface IProvisionX509Response {
  connectionString: string
  deviceCert: {
    cert: string
    key: string
  }
}

export async function provisionX509Device(payload?: any): Promise<IProvisionX509Response> {
  var deviceCert = {
    cert: fs.readFileSync(path.resolve(certFile)).toString(),
    key: fs.readFileSync(path.resolve(keyFile)).toString(),
  }

  const provSecurityClient = new X509Security(registrationId, deviceCert)
  const provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new Mqtt(), provSecurityClient)

  let deviceConnectionString = ''

  if (payload) {
    provisioningClient.setProvisioningPayload(payload)
  }

  return new Promise((resolve) => {
    provisioningClient.register((error?: Error, result?: RegistrationResult) => {
      if (result) {
        deviceConnectionString = `HostName=${result.assignedHub};DeviceId=${result.deviceId};x509=true`
        console.log('Registration Succeeded')
        console.log('-------------------------')
        console.log('assigned hub=' + result.assignedHub)
        console.log('deviceId=' + result.deviceId)
        console.log('payload=' + JSON.stringify(result.payload))
        console.log()
      }
      if (error) {
        console.error('Error on registering device:', error.toString())
      }

      console.log('deviceConnectionString', deviceConnectionString)

      resolve({
        connectionString: deviceConnectionString,
        deviceCert,
      })
    })
  })
}
export async function provisionDevice(symmetricKey: string, payload?: any): Promise<string> {
  return new Promise((resolve) => {
    const provSecurityClient = new SymmetricKeySecurityClient(registrationId, symmetricKey)
    const provisioningClient = ProvisioningDeviceClient.create(provisioningHost, idScope, new Mqtt(), provSecurityClient)

    let deviceConnectionString = ''

    if (payload) {
      provisioningClient.setProvisioningPayload(payload)
    }
    provisioningClient.register((error?: Error, result?: RegistrationResult) => {
      if (result) {
        deviceConnectionString = `HostName=${result.assignedHub};DeviceId=${result.deviceId};SharedAccessKey=${symmetricKey}`
        console.log('Registration Succeeded')
        console.log('-------------------------')
        console.log('assigned hub=' + result.assignedHub)
        console.log('deviceId=' + result.deviceId)
        console.log('payload=' + JSON.stringify(result.payload))
        console.log()
      }
      if (error) {
        console.error('Error on registering device:', error.toString())
      }

      console.log('deviceConnectionString', deviceConnectionString)

      resolve(deviceConnectionString)
    })
  })
}