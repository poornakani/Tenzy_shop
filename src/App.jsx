import {
  HashRouter as BrowserRouter,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";

import "./index.css";
import Header from "./HomePage/Header";
import Categories from "./HomePage/Categories";
import Banner01 from "./HomePage/Banner01";
import BestSelling from "./HomePage/Bestselling";
import Brands from "./HomePage/Brands";
import Footer from "./HomePage/Footer";
import FAQ from "./HomePage/FAQ";
import { WishlistProvider } from "./Context/WishlistContext";
import { CartProvider } from "./Context/CartContext";
import { AuthProvider } from "./Context/AuthContext";
import WishlistPage from "./Wishlist/WishlistPage";
import ProductDetails from "./Products/ProductDetails";
import ProductsPage from "./Products/ProductsPage";
import Navibar from "./HomePage/Navibar";
import CartPage from "./Cart/CartPage";
import { ToastProvider } from "./Context/ToastContext";
import CartToastStack from "./Widgets/CartToastStack";
import ContactUsPage from "./Contact/ContactUsPage";
import PageTransition from "./Animation/PageTransition";
import CustomerInfoPage from "./Policies/CustomerInfo";
import BlogPage from "./BlogsPages/BlogPage";
import BlogDetails from "./BlogsPages/BlogDetails";
import AuthPage from "./Authenticator/Pages/AuthPage";

// Admin
import AdminLayout from "./adminportal/AdminLayout";
import Dashboard from "./adminportal/pages/Dashboard";
import Orders from "./adminportal/pages/Orders";
import AdminProducts from "./adminportal/pages/AdminProducts";
import Dispatch from "./adminportal/pages/Dispatch";
import Customers from "./adminportal/pages/Customers";
import Reviews from "./adminportal/pages/Reviews";
import Reports from "./adminportal/pages/Reports";
import Procurement from "./adminportal/pages/Procurement";
import ReferenceData from "./adminportal/pages/ReferenceData";
import ArrivalVerification from "./adminportal/pages/ArrivalVerification";
import PricingManagement from "./adminportal/pages/PricingManagement";
import Stock from "./adminportal/pages/Stock";
import AuditLog from "./adminportal/pages/AuditLog";

const AdminGuard = ({ children }) => {
  const hasAdminFlag = localStorage.getItem("adminAuth") === "true";
  const hasToken     = !!localStorage.getItem("authToken");
  if (hasAdminFlag && hasToken) return children;
  // Clear stale flags so the login page starts clean
  localStorage.removeItem("adminAuth");
  localStorage.removeItem("authToken");
  localStorage.removeItem("authUser");
  return <Navigate to="/signin" replace />;
};

const Home = () => {
  return (
    <div className="w-full overflow-hidden">
      <Navibar />
      <Header />
      <Categories />
      <Banner01 />
      <BestSelling />
      {/* <Banner02 /> */}
      <Brands />
      <FAQ />
      <Footer />
    </div>
  );
};

const App = () => {
  return (
    <BrowserRouter>
      <PageTransition>
        <AuthProvider>
        <WishlistProvider>
          <ToastProvider>
            <CartProvider>
              <Routes>
                <Route path="/" element={<Navigate to="/home" replace />} />

                <Route path="/home" element={<Home />} />
                <Route path="/wishlist" element={<WishlistPage />} />
                <Route path="/products" element={<ProductsPage />} />
                <Route path="/product/:id" element={<ProductDetails />} />
                <Route path="/cart" element={<CartPage />} />
                <Route path="/contact" element={<ContactUsPage />} />
                <Route path="/help" element={<CustomerInfoPage />} />
                <Route path="/blog" element={<BlogPage />} />
                <Route path="/blog/:id" element={<BlogDetails />} />
                <Route path="/signin" element={<AuthPage />} />
                <Route path="/register" element={<AuthPage defaultMode="signup" />} />

                {/* Admin Portal */}
                <Route
                  path="/admin"
                  element={<AdminGuard><AdminLayout /></AdminGuard>}
                >
                  <Route index element={<Dashboard />} />
                  <Route path="orders" element={<Orders />} />
                  <Route path="products" element={<AdminProducts />} />
                  <Route path="procurement" element={<Procurement />} />
                  <Route path="arrival" element={<ArrivalVerification />} />
                  <Route path="pricing" element={<PricingManagement />} />
                  <Route path="dispatch" element={<Dispatch />} />
                  <Route path="stock" element={<Stock />} />
                  <Route path="customers" element={<Customers />} />
                  <Route path="reviews" element={<Reviews />} />
                  <Route path="reports" element={<Reports />} />
                  <Route path="audit-log" element={<AuditLog />} />
                  <Route path="reference" element={<ReferenceData />} />
                </Route>

                <Route path="*" element={<Navigate to="/home" replace />} />
              </Routes>
              <CartToastStack />
            </CartProvider>
          </ToastProvider>
        </WishlistProvider>
        </AuthProvider>
      </PageTransition>
    </BrowserRouter>
  );
};

export default App;
