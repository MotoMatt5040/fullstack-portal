import { Link } from "react-router-dom"

const Public = () => {

    const content = (
        <section className="public">
            <header>
                <h1>Welcome to the Promark Portal!</h1>
            </header>
            <main>
                <p>Currently you can log in, and do nothing else.</p>
                <p>&nbsp;</p>
                <address>
                    Promark Research<br />
                    313 Sawdut Rd<br />
                    Spring, TX 77380<br />
                    <a href="tel:+15555555555">(555) 555-5555</a>
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