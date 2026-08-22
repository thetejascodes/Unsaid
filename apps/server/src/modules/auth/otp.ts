import twilio from 'twilio'
import config from '../../common/config/index.js'

const client  = twilio(config.twilio.apiKeySid,config.twilio.apiKeySecret,{accountSid:config.twilio.accountSid})

const sendOtp = async(phone:string,code:string)=>{
    if(!config.twilio.accountSid){
        console.log("[DEV] OTP for " + phone + ": " + code)
        return;
    }
     await client.messages.create({
        body:`Your Unsaid verification code is: ${code}`,
        from:config.twilio.fromNumber,
        to:phone,
    })
}
export default sendOtp;