import * as SecureStore from "expo-secure-store";

export const saveRefreshToken = async(token:string)=>{
    await SecureStore.setItemAsync('refreshToken',token)

}
export const getRefreshToken = async()=>{
    return await SecureStore.getItemAsync('refreshToken');
}

export const clearRefreshToken = async()=>{
    await SecureStore.deleteItemAsync('refreshToken')
}