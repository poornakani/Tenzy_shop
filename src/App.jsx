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
import Banner02 from "./HomePage/Banner02";

import Brands from "./HomePage/Brands";
import Footer from "./HomePage/Footer";
import FAQ from "./HomePage/FAQ";
import { WishlistProvider } from "./Context/WishlistContext";
import { CartProvider } from "./Context/CartContext";
import WishlistPage from "./Wishlist/WishlistPage";
import ProductDetails from "./Products/ProductDetails";
import ProductsPage from "./Products/ProductsPage";
import Navibar from "./HomePage/Navibar";
import CartPage from "./Cart/CartPage";
import { ToastProvider } from "./Context/ToastContext";
import CartToastStack from "./Widgets/CartToastStack";
import ContactUsPage from "./Contact/ContactUsPage";
import PageTransition from "./Animation/PageTransition";
import CustomerInfoPage from "./Poliyices/CustomerInfo";

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
              </Routes>
              <CartToastStack />
            </CartProvider>
          </ToastProvider>
        </WishlistProvider>
      </PageTransition>
    </BrowserRouter>
  );
};

export default App;
