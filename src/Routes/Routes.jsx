import Home from "../Components/Pages/Home/Home.jsx"
import { Routes, Route } from 'react-router-dom'
import { Toaster } from 'react-hot-toast'
import Profile from "../Components/Pages/Profile/Profile.jsx"
import Categories from "../Components/Pages/Categories/Categories.jsx"
import Clients from "../Components/Pages/Clients/Clients.jsx"
import Supplier from "../Components/Pages/Suppliers/Supplier.jsx"
import Login from "../Components/Pages/Login/Login.jsx"
import ProductInventory from "../Components/Pages/Products/ProductInventory.jsx"
import Spent from "../Components/Pages/Spents/Spent.jsx"

export default function AppRoutes() {
    return (
        <>
            <Toaster
                position="top-right"
                toastOptions={{
                    duration: 2500,
                    className: 'toast-common',
                    success: { className: 'toast-default' },
                    error: { className: 'toast-error' },
                }}
            />
            <Routes>
                <Route path="/" element={<Login />}></Route>
                <Route path="/tables" element={<Home />}></Route>
                <Route path="/profile" element={<Profile />}></Route>
                <Route path="/categories" element={<Categories />}></Route>
                <Route path="/clients" element={<Clients />}></Route>
                <Route path="/suppliers" element={<Supplier />}></Route>
                <Route path="/products" element={<ProductInventory />}></Route>
                <Route path="/invoices/buys" element={<Spent />}></Route>
                <Route path="/invoices/sales" element={<Spent />}></Route>
                <Route path="/spents" element={<Spent />}></Route>
            </Routes>
        </>
    )
}  