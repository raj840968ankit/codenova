import { AppRoutes } from "./routes/AppRoutes"
import { UserProvider } from "./context/user.context"

export const App = () => {
  return (
    <UserProvider>
      <AppRoutes />
    </UserProvider>
  )
}
