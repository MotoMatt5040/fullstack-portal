import React from "react";
import { Link } from "react-router-dom"

const Public = () => {

    const content = (
        <section className="public">
            <header>
                <h1>Welcome to the Promark Portal</h1>
            </header>
            <main>
                <address>
                    Promark Research<br />
                    313 Sawdut Rd<br />
                    Spring, TX 77380<br />
                    <a href="tel:+12815877600">(281) 587-7600</a>
                </address>
            </main>
            
            <footer>
                <Link to="/login">Employee Login</Link>
            </footer>
        </section>

    )
    return content
}
export default Public