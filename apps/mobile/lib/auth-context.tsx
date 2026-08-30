import { Children, createContext,useContext,useState } from "react";
import { setAccessToken } from "./api";
import { saveRefreshToken,clearRefreshToken } from "./auth-storage";

interface User{
    id:string;
    username:string;
    avatarurl:string;
    bio:string;
}

interface AuthContextType{
    user:User | null;
    isLoading:boolean;
    login:(accessToken:string,refreshToken:string,user:User)=>void;
    logout: () => void;
}

const AuthContext = createContext<AuthContextType | null>(null);

const AuthProvider = ({children}:{children:React.ReactNode})=>{
    const [user,setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState<boolean>(true);

    const login = async(accessToken: string, refreshToken: string, user: User)=>{
        setAccessToken(accessToken);
        await saveRefreshToken(refreshToken);
        setUser(user);
    }
    const logout = async()=>{
        await clearRefreshToken();
        setUser(null);
    }

    return(
        <AuthContext.Provider value={{user,isLoading,login,logout}}>
            {children}
        </AuthContext.Provider>
    )

}
export const useAuth = () => useContext(AuthContext)
