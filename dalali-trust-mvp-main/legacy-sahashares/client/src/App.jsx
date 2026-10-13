import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import { ThemeProvider } from './context/ThemeContext';
import { LanguageProvider } from './context/LanguageContext';
import Navbar from './components/Navbar';
import Footer from './components/Footer';
import Home from './pages/Home';
import Login from './pages/Login';
import Signup from './pages/Signup';
import ForgotPassword from './pages/ForgotPassword';
import Marketplace from './pages/Marketplace';
import Portfolio from './pages/Portfolio';
import Account from './pages/Account';
import Verify from './pages/Verify';
import MyProperties from './pages/MyProperties';
import PropertyDetails from './pages/PropertyDetails';
import { HelpCenter, UssdInstructions, Terms, PrivacyPolicy } from './pages/StaticPages';
import AIBrokerChat from './components/AIBrokerChat';
import Analytics from './pages/Analytics';

export default function App() {
    return (
        <BrowserRouter>
            <LanguageProvider>
                <ThemeProvider>
                    <AuthProvider>
                        {/* Animated background orbs */}
                        <div aria-hidden="true">
                            <div
                                className="orb w-[600px] h-[600px] bg-invest-300 dark:bg-invest-700"
                                style={{ top: '-10%', left: '-8%' }}
                            />
                            <div
                                className="orb w-[450px] h-[450px] bg-navy-300 dark:bg-navy-800"
                                style={{ bottom: '5%', right: '-5%', animationDelay: '-7s' }}
                            />
                            <div
                                className="orb w-[380px] h-[380px] bg-gold-300 dark:bg-gold-800"
                                style={{ top: '45%', left: '38%', animationDelay: '-14s' }}
                            />
                        </div>
                        <div className="noise-overlay" />

                        <div className="min-h-screen flex flex-col">
                            <Navbar />
                            <main className="flex-1">
                                <Routes>
                                    <Route path="/" element={<Home />} />
                                    <Route path="/login" element={<Login />} />
                                    <Route path="/signup" element={<Signup />} />
                                    <Route path="/forgot-password" element={<ForgotPassword />} />
                                    <Route path="/marketplace" element={<Marketplace />} />
                                    <Route path="/property/:id" element={<PropertyDetails />} />
                                    <Route path="/portfolio" element={<Portfolio />} />
                                    <Route path="/account" element={<Account />} />
                                    <Route path="/my-properties" element={<MyProperties />} />
                                    <Route path="/verify" element={<Verify />} />
                                    <Route path="/analytics" element={<Analytics />} />
                                    <Route path="/help" element={<HelpCenter />} />
                                    <Route path="/ussd-instructions" element={<UssdInstructions />} />
                                    <Route path="/terms" element={<Terms />} />
                                    <Route path="/privacy" element={<PrivacyPolicy />} />
                                </Routes>
                            </main>
                            <Footer />
                        </div>
                        <AIBrokerChat />
                    </AuthProvider>
                </ThemeProvider>
            </LanguageProvider>
        </BrowserRouter>
    );
}
