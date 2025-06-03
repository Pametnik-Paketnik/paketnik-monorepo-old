import { useEffect } from "react"
import { useSelector } from "react-redux"
import { useNavigate } from "react-router-dom"
import type { RootState } from "@/store"
import { AuthForm } from "@/components/auth-form"

export default function Page() {
  const navigate = useNavigate()
  const { user, isInitialized } = useSelector((state: RootState) => state.auth)

  useEffect(() => {
    if (isInitialized && user) {
      navigate("/", { replace: true })
    }
  }, [user, isInitialized, navigate])

  if (!isInitialized) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-spin rounded-full border-4 border-primary border-t-transparent"></div>
      </div>
    )
  }

  return (
    <div className="flex min-h-svh w-full items-center justify-center p-6 md:p-10">
      <div className="w-full max-w-sm">
        <AuthForm mode="login" />
      </div>
    </div>
  )
}
