"use client"

import React, { useEffect, useState } from "react"
import { motion } from "framer-motion"
import { Link, useLocation } from "react-router-dom"
import { LucideIcon } from "lucide-react"
import { cn } from "@/lib/utils"
import { 
  Home, 
  User, 
  Briefcase, 
  FileText, 
  Menu, 
  Utensils,
  Calendar,
  Settings,
  LogOut,
  LogIn
} from "lucide-react"

interface NavItem {
  name: string
  url: string
  icon: LucideIcon
}

interface TubelightNavbarProps {
  items?: NavItem[]
  className?: string
  isAuthenticated?: boolean
  onAuthClick?: () => void
  onLogout?: () => void
}

export function TubelightNavbar({ 
  items, 
  className, 
  isAuthenticated = false,
  onAuthClick,
  onLogout
}: TubelightNavbarProps) {
  const location = useLocation()
  const [activeTab, setActiveTab] = useState("Home")
  const [isMobile, setIsMobile] = useState(false)

  const defaultItems: NavItem[] = [
    { name: "Início", url: "/", icon: Home },
    { name: "Cardápio", url: "/menu", icon: Utensils },
    { name: "Calendário", url: "/calendar", icon: Calendar },
  ]

  const navItems = items || defaultItems

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 768)
    }

    handleResize()
    window.addEventListener("resize", handleResize)
    return () => window.removeEventListener("resize", handleResize)
  }, [])

  useEffect(() => {
    const currentItem = navItems.find(item => item.url === location.pathname)
    if (currentItem) {
      setActiveTab(currentItem.name)
    }
  }, [location.pathname, navItems])

  return (
    <div 
      className={cn(
        "fixed top-4 left-1/2 -translate-x-1/2 z-50",
        className,
      )}
    >
      <div className="flex items-center gap-2 bg-black/30 backdrop-blur-lg py-2 px-3 rounded-full shadow-2xl border border-white/30">
        {/* Botões à esquerda */}
        <div className="flex items-center gap-2">
          {navItems.slice(0, Math.ceil(navItems.length / 2)).map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.name

            return (
              <Link
                key={item.name}
                to={item.url}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  "relative cursor-pointer text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300",
                  "text-white/90 hover:text-white hover:bg-white/15",
                  isActive && "bg-white/25 text-white",
                )}
              >
                <span className="hidden md:inline relative z-10">{item.name}</span>
                <span className="md:hidden relative z-10">
                  <Icon size={18} strokeWidth={2.5} />
                </span>
                {isActive && (
                  <motion.div
                    layoutId="tubelight"
                    className="absolute inset-0 w-full bg-gradient-to-r from-white/30 via-white/50 to-white/30 rounded-full -z-10"
                    initial={false}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 30, 
                    }}
                  >
                    {/* Efeito de brilho superior */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-white rounded-full blur-sm" />
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-white/50 rounded-full blur-md" />
                    
                    {/* Efeito de brilho difuso */}
                    <div className="absolute inset-0 bg-white/20 rounded-full blur-lg" />
                    <div className="absolute inset-1 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
                  </motion.div>
                )}
              </Link>
            )
          })}
        </div>

        {/* Logo no centro */}
        <div className="flex items-center justify-center mx-4">
          <Link to="/" className="flex items-center justify-center w-10 h-10 bg-white/20 rounded-full hover:bg-white/30 transition-all duration-300">
            <div className="w-6 h-6 bg-gradient-to-r from-primary to-accent rounded-full flex items-center justify-center">
              <span className="text-white text-xs font-bold">SC</span>
            </div>
          </Link>
        </div>

        {/* Botões à direita */}
        <div className="flex items-center gap-2">
          {navItems.slice(Math.ceil(navItems.length / 2)).map((item) => {
            const Icon = item.icon
            const isActive = activeTab === item.name

            return (
              <Link
                key={item.name}
                to={item.url}
                onClick={() => setActiveTab(item.name)}
                className={cn(
                  "relative cursor-pointer text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300",
                  "text-white/90 hover:text-white hover:bg-white/15",
                  isActive && "bg-white/25 text-white",
                )}
              >
                <span className="hidden md:inline relative z-10">{item.name}</span>
                <span className="md:hidden relative z-10">
                  <Icon size={18} strokeWidth={2.5} />
                </span>
                {isActive && (
                  <motion.div
                    layoutId="tubelight"
                    className="absolute inset-0 w-full bg-gradient-to-r from-white/30 via-white/50 to-white/30 rounded-full -z-10"
                    initial={false}
                    transition={{ 
                      type: "spring", 
                      stiffness: 300, 
                      damping: 30, 
                    }}
                  >
                    {/* Efeito de brilho superior */}
                    <div className="absolute -top-1 left-1/2 -translate-x-1/2 w-6 h-1 bg-white rounded-full blur-sm" />
                    <div className="absolute -top-2 left-1/2 -translate-x-1/2 w-8 h-2 bg-white/50 rounded-full blur-md" />
                    
                    {/* Efeito de brilho difuso */}
                    <div className="absolute inset-0 bg-white/20 rounded-full blur-lg" />
                    <div className="absolute inset-1 bg-gradient-to-r from-transparent via-white/10 to-transparent rounded-full" />
                  </motion.div>
                )}
              </Link>
            )
          })}

          {/* Botão de autenticação */}
          {isAuthenticated ? (
            <div className="flex items-center gap-1 ml-1 pl-1 border-l border-white/30">
              <button
                onClick={onLogout}
                className="relative cursor-pointer text-sm font-semibold px-3 py-2 rounded-full transition-all duration-300 text-white/90 hover:text-white hover:bg-white/15"
              >
                <LogOut size={18} strokeWidth={2.5} />
              </button>
              <Link
                to="/admin"
                className="relative cursor-pointer text-sm font-semibold px-3 py-2 rounded-full transition-all duration-300 text-white/90 hover:text-white hover:bg-white/15"
              >
                <Settings size={18} strokeWidth={2.5} />
              </Link>
            </div>
          ) : (
            <button
              onClick={onAuthClick}
              className="relative cursor-pointer text-sm font-semibold px-4 py-2 rounded-full transition-all duration-300 bg-white/25 text-white hover:bg-white/35 ml-1 pl-1 border-l border-white/30"
            >
              <span className="hidden md:inline">Entrar</span>
              <LogIn size={18} strokeWidth={2.5} className="md:hidden" />
            </button>
          )}
        </div>
      </div>
    </div>
  )
}